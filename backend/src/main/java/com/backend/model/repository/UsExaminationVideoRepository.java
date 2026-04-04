package com.backend.model.repository;

import com.backend.model.entity.ExaminationRegion;
import com.backend.model.entity.UsExaminationVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UsExaminationVideoRepository extends JpaRepository<UsExaminationVideo, Long> {
    List<UsExaminationVideo> findByExaminationIdOrderByRegionAsc(Long examinationId);

    List<UsExaminationVideo> findByExaminationIdAndRegion(Long examinationId, ExaminationRegion region);
}
