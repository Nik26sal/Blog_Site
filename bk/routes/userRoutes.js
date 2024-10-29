import { Router } from "express";
import jwt  from "jsonwebtoken";
import { User } from '../models/userModel.js'
import { Comment } from "../models/commentModel.js";
import { Post } from '../models/postModel.js'
const router = Router();


//Generate Tokens 
const generateToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        console.log(user);
        const accessToken = await user.generateAccessToken ();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw error; 
    }
};

// middleWare/verifyUser.js
const verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken.id).select("-Password -refreshToken");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        req.user = user;
        next();

    } catch (error) {
        console.error("JWT Verification Error:", error);
        return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
    }
};

//1.Registration of User 
router.post("/register", async (req, res) => {
    try {
        const { Name, Email, Password } = req.body;

        if (!Name || !Email || !Password) {
            return res.status(401).json({ message: "Submit all fields Please" })
        }

        const exsitedUser = await User.findOne({ Email });

        if (exsitedUser) {
            return res.status(401).json({ message: "This user is already existed........." })
        }

        const user = await User.create({
            Name,
            Email,
            Password
        })

        const createdUser = await User.findById(user._id).select('-Password -refreshToken')

        if (!createdUser) {
            return res.status(500).json({ message: "Server error during registration. Please try again later." });
        }

        return res.status(201).json({ message: "User registered successfully.", user: createdUser });

    } catch (error) {

        console.error("Register Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });

    }
})
//2.Login of User
router.post("/login", async (req, res) => {
    try {
        const { Email, Password } = req.body;
        console.log(Email+"  " + Password);
        if (!Email || !Password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ Email });
        if (!user) {
            return res.status(400).json({ message: "User not registered. Please register first." });
        }
        const validatePassword = await user.isPasswordCorrect(Password);
        if (!validatePassword) {
            return res.status(400).json({ message: "Password is incorrect" });
        }
        const { accessToken, refreshToken } = await generateToken(user._id);
        const loggedInUser = await User.findById(user._id).select('-password -refreshToken');
        return res.status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", refreshToken)
            .json({
                user: loggedInUser,
                message: "User logged in successfully."
            });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//3.Logout User
router.post("/logout", verifyJWT, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { isLoggedIn: false }); 

        return res.status(200)
            .clearCookie("accessToken")
            .clearCookie("refreshToken")
            .json({ message: "Successfully logged out. Come back soon!" });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//4.DeleteAccount
router.post("/deleteAccount", verifyJWT, async (req, res) => {
    try {
        const deletedPosts = await Post.deleteMany({ User: req.user._id });
        const deletedUser = await User.findByIdAndDelete(req.user._id);
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found or already deleted" });
        }
        return res.status(200).json({ 
            message: "Account and associated posts deleted successfully." 
        });
    } catch (error) {
        console.error("Error deleting account and posts:", error);
        return res.status(500).json({ 
            message: "Sorry, something went wrong during account deletion." 
        });
    }
});
//5.Create Post Route
router.post("/uploadPost", verifyJWT, async (req, res) => {
    try {
        const { Content } = req.body;
        if (!Content || Content.trim() === "") {
            return res.status(400).json({ message: "Content cannot be empty" });
        }

        const post = await Post.create({
            Content,
            User: req.user._id
        });

        await User.findByIdAndUpdate(
            req.user._id,
            { $push: { Posts: post._id } },
            { new: true }
        );

        return res.status(201).json({
            message: "Post created successfully.",
            post: post
        });
    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({
            message: "Something went wrong while creating the post."
        });
    }
});

//6.Delete Post
router.post('/deletePost/:postId', verifyJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const post = await Post.findOne({ _id: req.params.postId, User: req.user._id });
        if (!post) {
            return res.status(404).json({ message: 'Post not found or does not belong to user' });
        }

        await Post.deleteOne({ _id: req.params.postId });

        user.Posts = user.Posts.filter(postId => postId.toString() !== req.params.postId);
        await user.save();

        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

//Comment on Post
router.post('/Comment/:postId', verifyJWT, async (req, res) => {
    try {
        const { Content } = req.body;

        if (!Content || Content.trim() === "") {
            return res.status(400).json({ message: "Content cannot be empty" });
        }

        const post = await Post.findOne({ _id: req.params.postId });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const comment = await Comment.create({
            Content,
            User: req.user._id,
            Post: req.params.postId
        });

        await Post.findByIdAndUpdate(
            req.params.postId,
            { $push: { Comments: comment._id } },
            { new: true }
        );

        res.status(201).json({ message: "Comment added successfully", comment });
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

//Get All Post
router.get('/getAllPost',verifyJWT,async(req,res)=>{
    const posts = await Post.find();
    res.status(202).json({post:posts});
})

// 8. Like a Post

export default router;