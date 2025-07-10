import Prompt from '../models/Prompt.js';
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import User from '../models/User.js';


// Create a new prompt
export const createPrompt = async (req, res) => {
  try {
    const {
      title,
      description,
      systemPrompt,
      userMessages = [],
      assistantMessages = [],
      categories = [],
      isPrivate = false,
    } = req.body;

    const userId = req?.user?._id

    if (!title || !description || !systemPrompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId).select('settings.username');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const username = user.settings?.username;
    
    const newPrompt = await Prompt.create({
      title,
      description,
      systemPrompt,
      userMessages,
      assistantMessages,
      categories,
      isPrivate,
      author:userId,
      username,
    });
    console.log(newPrompt)
    res.status(201).json(newPrompt);
  } catch (error) {
    console.error(error); 
    res.status(500).json({ error: 'Failed to save prompt' });
  }
};


// Get all prompts (supports search, sort & filter)
export const getAllPrompts = async (req,res)=>{
  try {
  
  const {searchWord ,categories,sort } = req.query;
  let filter = {isPrivate: false}
  if(searchWord && searchWord.trim() !== ""){
    const regex = new RegExp(searchWord, 'i');
    filter.$or=[
      {title : regex},
      {description : regex},
      {promptText : regex},
      {categories: regex},
    ];
  }

  if (categories && categories !== 'All Prompts'){
    filter.categories = categories;
  }

  let sortOption = {stars : -1};

  switch(sort){
    case 'Newest':
      sortOption = { createdAt: -1};
      break;
    case 'Most Forked':
      sortOption = {forkCount : -1};
      break
    case 'Most Used':
      sortOption = {copiedCount : -1};
      break;
    default :
    sortOption = {stars : -1};
  }

  const prompts = await Prompt.find(filter).sort(sortOption);

  res.status(200).json(prompts);
}catch(err){
  console.log(err)
  res.status(500).json({error: 'Failed to fetch prompts', err})
}
}

// Get one prompt
export const getPromptById = async (req, res) => {
  try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update prompt
export const updatePrompt = async (req, res) => {
  const userId = req?.user?._id;
  const promptId = req?.params?.id;

  try {
    const prompt = await Prompt.findOne({
      _id: promptId,
      author: userId,
    });

    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const allowedFields = [
      'title',
      'description',
      'systemPrompt',
      'userPrompt',
      'assistantMessages',
      'categories',
      'isPrivate',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        prompt[field] = req.body[field];
      }
    }

    const updatedPrompt = await prompt.save();

    return res.status(200).json({
      message: "Prompt updated successfully",
      data: updatedPrompt,
    });

  } catch (error) {
    console.error("Error updating prompt:", error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Delete prompt
export const deletePrompt = async (req, res) => {
  
  const promptId = req.params.id;
  const userId = req.user._id;
  console.log(userId,promptId)
  try {
    const deletedPrompt = await Prompt.findOneAndDelete({
    _id: promptId,
    author: userId
  })
    
    if (!deletedPrompt) return res.status(404).json({ error: 'Prompt not found' });
    
    return res.status(200).json({
      message:"Prompt Delected Successfully"
    });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    res.status(500).json({ error: 'Server error' });
  }
};

// copiedCount of prompt
export const incrementCopiedCount = async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { $inc: { copiedCount: 1 } },
      { new: true }
    );

    if (!prompt) return res.status(404).json({ message: "Prompt not found" });

    res.status(200).json({ copiedCount: prompt.copiedCount });
  } catch (err) {
    console.error("Error incrementing copied count:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// get stared prompts byUser
export const getStarredPromptsByUser = async (req, res)=>{
  try{
    const userId = req.user._id;
    console.log(userId)
    const starredPrompts = await Prompt.find({ stars: userId }).populate('author','name').sort({createdAt : -1});
    res.status(200).json(starredPrompts)

  }catch(err){
     console.error("Error fetching starred prompts:", err);
    res.status(500).json({ message: "Server error" });
  }
}


// Toggle star/unstar prompt
export const toggleStarPrompt = async (req, res) => {
  try {
    const promptId = req.params.id;
    const userId = req.user._id;

    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const alreadyStarred = prompt.stars.includes(userId);
 
    if (alreadyStarred) {
      prompt.stars.pull(userId);
      await prompt.save();
      return res.status(200).json({ message: "Prompt unstarred successfully" });
    } else {
      prompt.stars.push(userId);
      await prompt.save();
      return res.status(200).json({ message: "Prompt starred successfully" });
    }
  } catch (error) {
    console.error("Error in toggleStarPrompt:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// Fork a prompt (user submits form to create forked copy)

export const forkPrompt = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json("Unauthorized user");
  }

  const originalPromptId = req.params.id;

  // Get fork details from frontend
  const {
    title,
    description,
    systemPrompt,
    userMessages,
    assistantMessages,
    categories,
    isPrivate,
  } = req.body.data;

  // Create new prompt
  const newPrompt = new Prompt({
    title,
    description,
    systemPrompt,
    userMessages,
    assistantMessages,
    categories,
    isPrivate,
    username,
    author: userId,
  });

  await newPrompt.save();

  // Increment fork count on original prompt
  const original = await Prompt.findById(originalPromptId);
  if (original) {
    original.forkCount = (original.forkCount || 0) + 1;
    await original.save();
  }

  res.status(201).json(newPrompt);
});


