import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandlder } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJwt = asyncHandlder(async (req, res, next) => {
  try {
    //req.cookies all user tokens in it
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!token){
        throw new ApiError(401, "Unauthorized Request");
    }
    //--------Verify Token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )
        if(!user){
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();

  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid cccess token")
  }
});
