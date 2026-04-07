import axios from "axios";

  const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";


// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// Attach token automatically when sending a request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend status check
export async function getBackendStatus() {
  try {
    const response = await api.get("/api/health");

    return {
      connected: true,
      message: response.data.message || "Spring Boot is responding.",
    };
  } catch (error) {
    if (error.response) {
      return {
        connected: false,
        message: `Backend responded with status ${error.response.status}.`,
      };
    }

    return {
      connected: false,
      message: "Could not reach the Spring Boot server at http://localhost:8080.",
    };
  }
}

// Login
export async function loginUser({ username, password }) {
  try {
    const response = await api.post("/api/v1/auth/login", {
      username,
      password,
    });

    const jwt = response.data;

    if (jwt) {
      localStorage.setItem("token", jwt);
    }

    return jwt;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Invalid username or password."
      );
    }

    throw new Error("Could not reach the server.");
  }
}

// Register
export async function registerUser(userData) {
  try {
    const response = await api.post("/api/v1/auth/register", userData);
    return response.data;
  } catch (error) {
    console.error("Register Error:", error.message);

    if (error.response) {
      throw new Error(
        error.response.data?.message ||
          "Registration failed. Please try again."
      );
    }

    throw new Error("Could not connect to the registration server.");
  }
}

//Get videos
export async function getVideos(patientId, examinationName) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No authorization token found. Please log in.");

  try {
    console.log("Fetching videos:", `/api/v1/examinations/${patientId}/${examinationName}`);
    console.log("Token:", token);
    const response = await api.get(
      `/api/v1/examinations/${patientId}/${examinationName}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("HERE")
    console.log(response)
    return response.data;
  } catch (error) {
    console.error("Get Videos Error:", error.message);

    if (error.response) {
      throw new Error(
        error.response.data?.message || "Failed to fetch videos."
      );
    }

    throw new Error("Could not connect to the server.");
  }
}

//Send videos for preprocessing
/*
* The preprocess function sends the following information for each region in json format:
* Patient Id
* Examination Id
* Selected Frame Index
* Video name of the the selected examination
*/
export async function preprocess({ patientId, examinationId, selectedFrames }) {
  try {
    const processedFrames = [];

    for (const frame of selectedFrames) {
      // Include patientId and examinationId if your API requires them
      const payload = {
        patientId,
        examinationId,
        frame,
      };

      const response = await api.post("/api/v1/preprocess/apply", payload);
      processedFrames.push(response.data);
    }

    return processedFrames;
  } catch (error) {
    console.error("Preprocess Error:", error.message);

    if (error.response) {
      throw new Error(
        error.response.data?.message || "Preprocessing failed. Please try again."
      );
    }

    throw new Error("Could not connect to the server for preprocessing.");
  }
}