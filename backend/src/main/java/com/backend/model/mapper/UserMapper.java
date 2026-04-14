package com.backend.model.mapper;

import com.backend.model.dto.UserDTO;
import com.backend.model.entity.User;

public class UserMapper {
    public static UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUserName(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole());
        dto.setAllowedDataTypes(user.getAllowedDataTypes());
        dto.setEnabled(user.isEnabled());
        dto.setCreateTime(user.getCreateTime());
        dto.setUpdateTime(user.getUpdateTime());
        return dto;
    }

    public static User toEntity(UserDTO dto) {
        if (dto == null) {
            return null;
        }
        User user = new User();
        user.setId(dto.getId());
        user.setUserName(dto.getUserName());
        user.setEmail(dto.getEmail());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPhoneNumber(dto.getPhoneNumber());
        user.setRole(dto.getRole());
        user.setAllowedDataTypes(dto.getAllowedDataTypes());
        user.setEnabled(dto.isEnabled());
        // createTime is set automatically on persist, so we don't set it here
        return user;
    }
}
