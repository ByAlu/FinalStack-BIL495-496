package com.backend.exception.datamanagment;

public class PatientNotFoundException extends RuntimeException {
    public String message;
    public PatientNotFoundException(String message) {
        super(message);
        this.message = message;
    }
}
