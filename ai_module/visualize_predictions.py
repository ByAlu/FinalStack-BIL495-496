# visualize_predictions.py
#
# YOLO  : python visualize_predictions.py --model runs\detect\finetune_run\weights\best.pt --backend yolo  --data_dir ./dataset_prepared
# F-RCNN: python visualize_predictions.py --model runs\frcnn\finetune_run_frcnn\weights\best.pt --backend frcnn --data_dir ./dataset_prepared --output_dir ./predictions_frcnn
# Her iki backend de aynı argüman setini kullanır.
#
# Gereksinimler (YOLO):   pip install ultralytics opencv-python
# Gereksinimler (F-RCNN): pip install torch torchvision opencv-python

import numpy as np
import argparse
from pathlib import Path


# ─────────────────────────────────────────────
# YARDIMCI: ÇIZIM
# ─────────────────────────────────────────────

def draw_boxes(img: np.ndarray, boxes: list, class_names: dict, color: tuple, label_prefix: str = "") -> np.ndarray:
    """
    boxes: [[cls_id, cx, cy, w, h], ...]  ← normalize YOLO formatı
    """
    h, w = img.shape[:2]
    for box in boxes:
        cls_id = int(box[0])
        cx, cy, bw, bh = box[1], box[2], box[3], box[4]

        x1 = int((cx - bw / 2) * w)
        y1 = int((cy - bh / 2) * h)
        x2 = int((cx + bw / 2) * w)
        y2 = int((cy + bh / 2) * h)

        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        label = class_names.get(cls_id, f"cls{cls_id}")
        text  = f"{label_prefix}{label}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)

        ty = y1 - 5 if y1 > th + 10 else y2 + th + 5
        cv2.rectangle(img, (x1, ty - th - 4), (x1 + tw + 4, ty + 2), color, -1)
        cv2.putText(img, text, (x1 + 2, ty),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA)
    return img


def add_header(img: np.ndarray, text: str, color: tuple) -> np.ndarray:
    out = img.copy()
    cv2.rectangle(out, (0, 0), (img.shape[1], 28), color, -1)
    cv2.putText(out, text, (8, 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1, cv2.LINE_AA)
    return out


# ─────────────────────────────────────────────
# YARDIMCI: GROUND TRUTH & CLASS İSİMLERİ
# ─────────────────────────────────────────────

def load_ground_truth(txt_path: Path) -> list:
    """YOLO formatındaki label dosyasını okur → [[cls, cx, cy, bw, bh], ...]"""
    boxes = []
    if not txt_path.exists():
        return boxes
    with open(txt_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                cls_id = int(parts[0])
                cx, cy, bw, bh = map(float, parts[1:5])
                boxes.append([cls_id, cx, cy, bw, bh])
    return boxes


def load_class_names(data_dir: Path) -> dict:
    for candidate in [
        data_dir / "classes.txt",
        data_dir / "train" / "labels" / "classes.txt",
        data_dir.parent / "classes.txt",
    ]:
        if candidate.exists():
            with open(candidate) as f:
                return {i: l.strip() for i, l in enumerate(f) if l.strip()}
    return {}


# ─────────────────────────────────────────────
# BACKEND: YOLO
# ─────────────────────────────────────────────

class YOLOBackend:
    """ultralytics YOLO modelini sarar."""

    def __init__(self, model_path: str):
        from ultralytics import YOLO
        self.model = YOLO(model_path)
        # Model içinden class isimlerini al (fallback için)
        self.model_names: dict = self.model.names if hasattr(self.model, "names") else {}

    def predict(self, img_path: str, conf: float) -> list:
        """
        Döndürür: [[cls_id, cx, cy, bw, bh, score], ...]  normalize koordinatlar
        """
        results = self.model.predict(str(img_path), conf=conf, verbose=False)[0]
        boxes = []
        for box in results.boxes:
            cls_id   = int(box.cls.item())
            cx       = box.xywhn[0][0].item()
            cy       = box.xywhn[0][1].item()
            bw       = box.xywhn[0][2].item()
            bh       = box.xywhn[0][3].item()
            conf_val = box.conf.item()
            boxes.append([cls_id, cx, cy, bw, bh, conf_val])
        return boxes


# ─────────────────────────────────────────────
# BACKEND: FASTER R-CNN
# ─────────────────────────────────────────────

class FasterRCNNBackend:
    """
    finetune_frcnn.py ile kaydedilen .pt dosyasını yükler.
    Checkpoint formatı:
        {
          "model":       state_dict,
          "class_names": ["cat", "dog", ...],   ← 0-indexed, background hariç
          "num_classes": int,                    ← background dahil
          ...
        }
    """

    def __init__(self, model_path: str):
        import torch
        from torchvision.models.detection import (
            fasterrcnn_resnet50_fpn_v2,
            fasterrcnn_mobilenet_v3_large_fpn,
        )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        ckpt = torch.load(model_path, map_location=self.device)

        # class_names: ["cat", "dog"] → {0: "cat", 1: "dog"}  (0-indexed, background hariç)
        raw_names    = ckpt.get("class_names", [])
        self.model_names = {i: n for i, n in enumerate(raw_names)}
        num_classes  = ckpt.get("num_classes", len(raw_names) + 1)

        # Backbone tipini otomatik algıla (config.json yoksa ResNet50 varsay)
        backbone = ckpt.get("backbone", "resnet50")
        if backbone == "mobilenet":
            from torchvision.models.detection import fasterrcnn_mobilenet_v3_large_fpn
            model = fasterrcnn_mobilenet_v3_large_fpn(weights=None, num_classes=num_classes)
        else:
            model = fasterrcnn_resnet50_fpn_v2(weights=None, num_classes=num_classes)

        model.load_state_dict(ckpt["model"])
        model.eval()
        model.to(self.device)
        self.model = model
        print(f"✅ Faster R-CNN yüklendi | backbone={backbone} | "
              f"{num_classes - 1} sınıf | device={self.device}")

    def predict(self, img_path: str, conf: float) -> list:
        """
        Faster R-CNN'in [x1,y1,x2,y2] piksel çıktısını
        normalize YOLO formatına [cls_id, cx, cy, bw, bh, score] çevirir.

        NOT: Faster R-CNN label'ları 1-indexed'dir (0 = background).
             cls_id çıktısında 1 çıkarılır → YOLO ile aynı 0-indexed düzen.
        """
        import torch
        from torchvision import transforms as T
        from PIL import Image

        img_pil = Image.open(img_path).convert("RGB")
        W, H    = img_pil.size
        tensor  = T.ToTensor()(img_pil).unsqueeze(0).to(self.device)

        with torch.inference_mode():
            outputs = self.model(tensor)[0]

        boxes = []
        for box, label, score in zip(
            outputs["boxes"], outputs["labels"], outputs["scores"]
        ):
            if score.item() < conf:
                continue
            x1, y1, x2, y2 = box.tolist()
            cx = (x1 + x2) / 2 / W
            cy = (y1 + y2) / 2 / H
            bw = (x2 - x1) / W
            bh = (y2 - y1) / H
            cls_id = int(label.item()) - 1   # 1-indexed → 0-indexed
            boxes.append([cls_id, cx, cy, bw, bh, round(score.item(), 4)])

        return boxes


# ─────────────────────────────────────────────
# ANA VİZÜALİZASYON FONKSİYONU
# ─────────────────────────────────────────────

def visualize(
    model_path: str,
    backend:    str,
    data_dir:   str,
    split:      str,
    conf:       float,
    output_dir: str,
    max_images: int,
):
    data_dir   = Path(data_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    img_dir = data_dir / split / "images"
    lbl_dir = data_dir / split / "labels"

    img_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    image_files = sorted([
        p for p in img_dir.iterdir()
        if p.suffix.lower() in img_extensions
    ])

    if not image_files:
        print(f"❌ '{img_dir}' altında görsel bulunamadı.")
        return

    if max_images > 0:
        image_files = image_files[:max_images]

    # ── Backend seç ──────────────────────────
    if backend == "yolo":
        predictor = YOLOBackend(model_path)
    elif backend == "frcnn":
        predictor = FasterRCNNBackend(model_path)
    else:
        raise ValueError(f"Bilinmeyen backend: {backend}. 'yolo' veya 'frcnn' kullanın.")

    # ── Class isimleri: önce data_dir, sonra model ──
    class_names = load_class_names(data_dir)
    if not class_names:
        class_names = predictor.model_names
    if not class_names:
        print("⚠️  classes.txt bulunamadı ve modelde class ismi yok. ID olarak gösterilecek.")

    # Renkler
    GT_COLOR   = (34,  197,  94)   # yeşil
    PRED_COLOR = (239,  68,  68)   # kırmızı

    print(f"\n🔍 Backend : {backend.upper()}")
    print(f"   Model   : {model_path}")
    print(f"   Split   : {split}  |  conf > {conf}")
    print(f"   Görsel  : {len(image_files)}  →  '{output_dir}'\n")

    for img_path in image_files:
        img_orig = cv2.imread(str(img_path))
        if img_orig is None:
            print(f"  ⚠️  Okunamadı: {img_path.name}")
            continue
        img_orig = cv2.cvtColor(img_orig, cv2.COLOR_BGR2RGB)
        h_img, w_img = img_orig.shape[:2]

        # ── Ground Truth ─────────────────────
        img_gt   = img_orig.copy()
        gt_boxes = load_ground_truth(lbl_dir / (img_path.stem + ".txt"))
        draw_boxes(img_gt, gt_boxes, class_names, GT_COLOR, label_prefix="GT: ")

        # ── Prediction ───────────────────────
        img_pred   = img_orig.copy()
        pred_boxes = predictor.predict(str(img_path), conf)

        # Tahminleri çiz (conf skoru etikete ekle)
        for box in pred_boxes:
            cls_id, cx, cy, bw, bh, score = box
            x1 = int((cx - bw / 2) * w_img)
            y1 = int((cy - bh / 2) * h_img)
            x2 = int((cx + bw / 2) * w_img)
            y2 = int((cy + bh / 2) * h_img)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w_img, x2), min(h_img, y2)

            cv2.rectangle(img_pred, (x1, y1), (x2, y2), PRED_COLOR, 2)
            label = class_names.get(cls_id, f"cls{cls_id}")
            text  = f"{label} {score:.2f}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            ty = y1 - 5 if y1 > th + 10 else y2 + th + 5
            cv2.rectangle(img_pred, (x1, ty - th - 4), (x1 + tw + 4, ty + 2), PRED_COLOR, -1)
            cv2.putText(img_pred, text, (x1 + 2, ty),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

        # ── Başlık bantları ───────────────────
        img_gt   = add_header(img_gt,   "GROUND TRUTH",                    GT_COLOR)
        img_pred = add_header(img_pred, f"PREDICTION [{backend.upper()}]  conf>{conf}", PRED_COLOR)

        # ── Yan yana birleştir ────────────────
        divider  = np.ones((h_img, 4, 3), dtype=np.uint8) * 200
        combined = np.concatenate([img_gt, divider, img_pred], axis=1)
        combined = cv2.cvtColor(combined, cv2.COLOR_RGB2BGR)

        out_path = output_dir / f"{img_path.stem}_compare.jpg"
        cv2.imwrite(str(out_path), combined)
        print(f"  ✅ {img_path.name:40s} | GT: {len(gt_boxes):2d} box | "
              f"Pred: {len(pred_boxes):2d} box")

    print(f"\n🎉 Tamamlandı! Sonuçlar: '{output_dir}'")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="YOLO & Faster R-CNN tahminlerini Ground Truth ile yan yana görselleştir"
    )
    parser.add_argument("--model",      required=True,
                        help="Model ağırlık dosyası (.pt)")
    parser.add_argument("--backend",    required=True, choices=["yolo", "frcnn"],
                        help="'yolo'  → ultralytics YOLO\n"
                             "'frcnn' → finetune_frcnn.py ile eğitilmiş Faster R-CNN")
    parser.add_argument("--data_dir",   required=True,
                        help="dataset_prepared klasörü (train/val/test alt dizinleri içermeli)")
    parser.add_argument("--split",      default="val", choices=["train", "val", "test"],
                        help="Hangi split görselleştirilsin (varsayılan: val)")
    parser.add_argument("--conf",       type=float, default=0.25,
                        help="Güven eşiği (varsayılan: 0.25)")
    parser.add_argument("--output_dir", default="./predictions",
                        help="Çıktı klasörü (varsayılan: ./predictions)")
    parser.add_argument("--max_images", type=int, default=0,
                        help="İşlenecek maksimum görsel sayısı (0 = hepsi)")
    args = parser.parse_args()

    visualize(
        model_path = args.model,
        backend    = args.backend,
        data_dir   = args.data_dir,
        split      = args.split,
        conf       = args.conf,
        output_dir = args.output_dir,
        max_images = args.max_images,
    )