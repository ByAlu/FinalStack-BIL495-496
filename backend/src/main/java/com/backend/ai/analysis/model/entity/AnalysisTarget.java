package com.backend.ai.analysis.model.entity;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisTarget {
    private boolean b_lines;
    private boolean rds_score;
    private boolean bounding_boxes;

    @Override
    public String toString() {
        return "AnalysisTargett{" +
                "blines='" + b_lines + '\'' +
                ", rds='" + rds_score + '\'' +
                ", bboxes=" + bounding_boxes +
                '}';
    }
}