package com.backend.exception.auth;

public class UserAlreadyExistsException extends RuntimeException {
    public String message;
    public UserAlreadyExistsException(String message) {
        super(message);
        this.message = message;
    }
}