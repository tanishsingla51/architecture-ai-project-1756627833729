import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, 'name is required');
  }

  const playlist = await Playlist.create({
    name,
    description: description || '',
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, 'failed to create playlist');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, 'playlist created successfully'));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid userId');
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'videos',
        foreignField: '_id',
        as: 'videos',
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: '$videos',
        },
        totalViews: {
          $sum: '$videos.views',
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, 'User playlists fetched successfully')
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid PlaylistId');
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }

  const playlistVideos = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'videos',
        foreignField: '_id',
        as: 'videos',
        pipeline: [
          {
            $match: {
              isPublished: true,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
            },
          },
          {
            $addFields: {
              owner: {
                $first: '$owner',
              },
            },
          },
          {
            $project: {
              'owner.password': 0,
              'owner.refreshToken': 0,
              'owner.email': 0,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistVideos, 'playlist fetched successfully')
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid PlaylistId or videoId');
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'only owner can add video to their playlist');
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      400,
      'failed to add video to playlist please try again'
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        'Added video to playlist successfully'
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid PlaylistId or videoId');
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'only owner can remove video from their playlist');
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        'Removed video from playlist successfully'
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid PlaylistId');
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'only owner can delete the playlist');
  }

  await Playlist.findByIdAndDelete(playlist?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'playlist deleted successfully'));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, 'name and description are required');
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid PlaylistId');
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'only owner can edit the playlist');
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, 'playlist updated successfully')
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
