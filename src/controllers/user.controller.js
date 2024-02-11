import { asyncHandlder } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloundinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//----------GenerateAccessAndRefreshToken
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const userRegister = asyncHandlder(async (req, res) => {
  //--------Get user details from frontend
  const { username, email, fullName, password } = req.body;

  //--------Validation - not empty

  // if(username === ""){
  //     throw error        also check like this
  // }
  if (
    [username, email, fullName, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //--------Check if user already exists: username, email
  const userExisted = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (userExisted) {
    throw new ApiError(
      409,
      "User with this email or username are already exist"
    );
  }

  //--------Check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // console.log(req.files)
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }

  //---------Upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  //--------Create user object create entry in db
  const user = await User.create({
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
  });
  //-------Check for user creation
  const userCreated = await User.findById(user).select(
    "-password -refreshToken"
  );
  if (!userCreated) {
    throw new ApiError(500, "Something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, userCreated, "Registering User Successfully"));
});

const userLogin = asyncHandlder(async (req, res) => {
  const { email, username, password } = req.body;
//   console.log(email);

  if (!(username || email)) {
    throw new ApiError(400, "Email and username are required");
  }
  //-------Check User through Email or Username
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exit");
  }
  //-------Check Password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid user credentials");
  }
  //-------Send Token through cookies
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedIn = await User.findById(user._id).select(
    //Remove password and refreshToken
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedIn,
          accessToken,
          refreshToken,
        },
        "User Logged in successfully"
      )
    );
});

const userLogout = asyncHandlder(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
        200,
        {},
        "User Logged Out successfully"
        )
    );
});

export { userRegister, userLogin, userLogout };
