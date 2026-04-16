package com.backend.model.dto;

import lombok.Getter;
import java.util.List;

@Getter
public class GCSPage<T> {
    private final List<T> content;
    private final String nextPageToken;
    private final boolean hasNext;

    public GCSPage(List<T> content, String nextPageToken) {
        this.content = content;
        this.nextPageToken = nextPageToken;
        this.hasNext = nextPageToken != null && !nextPageToken.isEmpty();
    }

    public GCSPage(List<T> content, String nextPageToken, boolean hasNext) {
        this.content = content;
        this.nextPageToken = nextPageToken;
        this.hasNext = hasNext;
    }
}
