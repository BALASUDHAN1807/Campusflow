import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.middleware.js";

export class AuthService {
  static getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("JWT_SECRET is not configured on server", 500);
    }
    return secret;
  }

  static getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || "1d";
  }

  static generateToken(payload) {
    const secret = this.getJwtSecret();
    const expiresIn = this.getJwtExpiresIn();
    const options = { expiresIn: expiresIn };
    return jwt.sign(payload, secret, options);
  }

  static verifyToken(token) {
    const secret = this.getJwtSecret();
    try {
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch {
      throw new AppError("Invalid or expired authentication token.", 401);
    }
  }

  static sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  static async register(input) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError("An account with this email already exists.", 409);
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create user in PostgreSQL - Public registration is STRICTLY STUDENT role
    const newUser = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const safeUser = this.sanitizeUser(newUser);
    const token = this.generateToken({ userId: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  }

  static async login(input) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user not found, return generic authentication error
    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password.", 401);
    }

    const safeUser = this.sanitizeUser(user);
    const token = this.generateToken({ userId: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  }

  static async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }
}
