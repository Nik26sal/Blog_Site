import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
    Content: {
        type: String,
        required: true,
        trim: true
    },
    Likes: [
        { type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }
    ],
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
},
    {
        timestamps: true
    }
);
export const Post = mongoose.model('Post', postSchema);