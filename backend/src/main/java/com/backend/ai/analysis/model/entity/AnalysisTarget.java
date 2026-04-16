package com.backend.ai.analysis.model.entity;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisTarget {
    private boolean b_lines;
    private boolean rds_score;

    @Override
    public String toString() {
        return "SelectedModules{" +
                "b_lines=" + b_lines +
                ", rds_score=" + rds_score +
                '}';
    }
}
