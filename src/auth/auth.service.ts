import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { DatabaseService } from '../database/database.service.js';
import { JwtService } from '@nestjs/jwt';

// @Injectable() tells NestJS that this class can be managed by its
// dependency injection system and injected into other classes.
@Injectable()
export class AuthService {

  // Dependency injection:
  // DatabaseService provides access to the database through Prisma.
  // JwtService handles creating and signing JSON Web Tokens.
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // REGISTER A NEW MERCHANT
  // ============================================================

  // async allows this method to use await for asynchronous operations.
  // RegisterAuthDto defines the structure of the registration data
  // that this method expects to receive.
  async register(registerAuthDto: RegisterAuthDto) {

    // Destructuring extracts the required properties from the DTO.
    // Instead of repeatedly writing registerAuthDto.email, we can
    // access email, name, password and phone directly.
    const { name, email, password, phone } = registerAuthDto;

    // Check whether a merchant with this email already exists.
    // findUnique() queries the database using the unique email field.
    const existingUser = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    // If a matching merchant exists, registration is rejected.
    // ConflictException produces an HTTP 409 Conflict response.
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the password before saving it.
    // bcrypt.hash() uses a salt and a configurable work factor.
    // ENCYPTION_SALT is the environment variable used by this code
    // to supply that work factor.
    // Number() converts the environment variable from a string to a number.
    // The original password is never intentionally stored in the database.
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.ENCYPTION_SALT),
    );

    // Create the merchant record in the database.
    // The password field receives the bcrypt hash, not the plaintext password.
    const user = await this.databaseService.merchant.create({
      data: { name, email, password: hashedPassword, phone },
    });

    // Return a success message and the registered email.
    // We do not return the password or its hash.
    return { "message": "you have rgistered successfully", email: user.email };
  }

  // ============================================================
  // LOG IN AN EXISTING MERCHANT
  // ============================================================

  // LoginAuthDto defines the expected login data, typically email
  // and password.
  async login(loginAuthDto: LoginAuthDto) {

    // Extract the email and password supplied by the client.
    const { email, password } = loginAuthDto;

    // Search the database for a merchant with the supplied email.
    const user = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    // ------------------------------------------------------------
    // ERROR HANDLING
    // ------------------------------------------------------------

    // If no merchant exists with this email, reject the login.
    // UnauthorizedException produces an HTTP 401 response.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the submitted password with the stored bcrypt hash.
    // bcrypt.compare() handles the salt and hashing parameters encoded
    // in the stored hash; you do not hash the submitted password manually.
    const passwordMatch = await bcrypt.compare(password, user.password);

    // If the passwords do not match, reject the login.
    // The same error message is used for an unknown email and an incorrect
    // password to avoid revealing which credential was wrong.
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // ------------------------------------------------------------
    // GENERATE THE JWT ACCESS TOKEN
    // ------------------------------------------------------------

    // The JWT payload contains information identifying the merchant.
    // "sub" means subject: the ID of the account the token represents.
    // The email is included as an additional claim.
    const payload = { sub: user.id, email: user.email };

    // signAsync() creates and signs the JWT using the configuration
    // supplied to JwtModule, including its signing secret and any
    // configured expiration time.
    // The token allows the client to authenticate future requests.
    return {
      accessToken: await this.jwtService.signAsync(payload)
    };
  }

  // ============================================================
  // LOGOUT A LOOGED IN USER - REMOVE PERSISTENCE BY BLACKLISTING THE TOKEN AND 
  //=============================================================

  async logout() {
    return "Logout successfully"
  }

  // ============================================================
  // UPDATE AN AUTH RECORD — GENERATED PLACEHOLDER
  // ============================================================

  // This method is currently a NestJS scaffold.
  // It does not update any database record; it only returns a string.
  // The id parameter identifies the record in the intended implementation.
  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  // ============================================================
  // REMOVE AN AUTH RECORD — GENERATED PLACEHOLDER
  // ============================================================

  // This method is also a scaffold.
  // It does not delete anything from the database yet.
  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}

// osadabwa the comments are AI generated. I aint that creative 😂