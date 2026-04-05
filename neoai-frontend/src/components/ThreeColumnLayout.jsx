import { useState } from "react";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import SvgIcon from "@mui/icons-material/ArrowForwardIos";

export default function ThreeColumnLayout({ leftContent, mainContent, rightContent, leftTitleContent, rightTitleContent }) {
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  return (
    <section className={`selection-layout${showLeft ? "" : " hide-left"}${showRight ? "" : " hide-right"}`}>
      {/* Left Sidebar */}
      <section className={`selection-sidebar panel${showLeft ? "" : " collapsed"}`}>
        {showLeft ? (
          <div className="selected-frames-panel">
            <div className="selected-frames-header">
                <button
                className="panel-arrow-toggle"
                type="button"
                onClick={() => setShowLeft(false)}
                >
                <ArrowBackIosIcon fontSize="small"/>
                </button>
                <div>{leftTitleContent}</div>

            </div>
        
            <div className="panel-content">{leftContent}</div>
          </div>
        ) : (
          <button
            className="panel-edge-toggle"
            type="button"
            onClick={() => setShowLeft(true)}
          >
            <ArrowForwardIosIcon fontSize="small"/>
          </button>
        )}
      </section>

      {/* Main Panel */}
      <section className="selection-main panel">
        {mainContent}
      </section>

      {/* Right Sidebar */}
      <section className={`selected-frames-sidebar panel${showRight ? "" : " collapsed"}`}>
        {showRight ? (
          <div className="selected-frames-panel">
            <div className="selected-frames-header">
                <button
                className="panel-arrow-toggle"
                type="button"
                onClick={() => setShowRight(false)}
                >
                <ArrowForwardIosIcon fontSize="small"/>
                </button>
                <div>{rightTitleContent}</div>
            </div>
            <div className="panel-content">{rightContent}</div>
          </div>
        ) : (
          <button
            className="panel-edge-toggle"
            type="button"
            onClick={() => setShowRight(true)}
          >
            <ArrowBackIosIcon fontSize="small"/>
          </button>
        )}
      </section>
    </section>
  );
}