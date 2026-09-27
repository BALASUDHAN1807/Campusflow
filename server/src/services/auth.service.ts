import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { RegisterInput, LoginInput } from "../validators/auth.validator.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("JWT_SECRET is not configured on server", 500);
    }
    return secret;
  }

  private static getJwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || "1d";
  }

  public static generateToken(payload: TokenPayload): string {
    const secret = this.getJwtSecret();
    const expiresIn = this.getJwtExpiresIn();
    const options: jwt.SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, secret, options);
  }

  public static verifyToken(token: string): TokenPayload {
    const secret = this.getJwtSecret();
    try {
      const decoded = jwt.verify(token, secret) as TokenPayload;
      return decoded;
    } catch {
      throw new AppError("Invalid or expired authentication token.", 401);
    }
  }

  public static sanitizeUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  public static async register(input: RegisterInput): Promise<AuthResult> {
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

  public static async login(input: LoginInput): Promise<AuthResult> {
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

  public static async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }
}
