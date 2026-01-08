export interface User {
  id: string;
  name: string;
  email: string;
  householdSize: number;
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  householdSize?: number;
  dietaryRestrictions?: string[];
  favoriteCuisines?: string[];
}

export interface UpdateProfileData {
  name?: string;
  householdSize?: number;
  dietaryRestrictions?: string[];
  favoriteCuisines?: string[];
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}