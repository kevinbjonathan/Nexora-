# Nexora Hero Background Video

Place your cinematic background video at:

```
public/videos/nexora-hero.mp4
```

## Requirements

- Format: MP4 (H.264 encoded)
- Duration: 10-30 seconds, seamless or near-seamless loop
- Resolution: 1920x1080 or higher
- File size: Under 5MB recommended for fast loading

## Content direction

- Abstract contemporary architecture
- Dark forest-green and charcoal tones
- Subtle reflections on glass or polished surfaces
- Slow, controlled camera movement
- Gentle natural light passing across architectural surfaces
- No readable text, logos, or UI elements
- No visible human faces
- No rapid cuts, flashy neon, or obvious science-fiction imagery

## Fallback behavior

If no video file exists at this path, the homepage automatically displays a high-quality static architectural image as the hero background. The page looks intentional either way.

## Optional environment variable

You can override the video path via:

```
VITE_NEXORA_HERO_VIDEO=/videos/your-custom-video.mp4
```

Add this to your `.env` file if you want to use a differently named or located video asset.
