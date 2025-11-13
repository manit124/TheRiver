export function coverflow(offset: number, isMobile: boolean = false) {
  // Allow wider range to show wrapped-around modes
  const clamped = Math.max(-4, Math.min(4, offset));
  
  // Spherical positioning - larger radius for more curve
  const radius = isMobile ? 500 : 650;
  const angle = clamped * 30; // degrees per card
  
  // Calculate position on sphere arc (circular motion)
  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;
  
  // Position on circular arc
  const translateX = Math.sin(angleRad) * radius;
  const translateZ = -radius + Math.cos(angleRad) * radius;
  
  // Rotation matches the angle for proper 3D orientation
  const rotateY = angle;
  
  // Scale and opacity based on distance from center (more aggressive)
  const distanceFromCenter = Math.abs(clamped);
  const scale = 1 - Math.min(distanceFromCenter * 0.15, 0.4);
  const opacity = 1 - Math.min(distanceFromCenter * 0.25, 0.8);

  return { rotateY, translateX, translateZ, scale, opacity };
}
