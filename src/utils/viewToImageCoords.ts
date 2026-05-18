/** Map a tap on the camera preview (cover fit) to photo pixel coordinates. */
export function viewPointToImagePoint(
  tapX: number,
  tapY: number,
  viewWidth: number,
  viewHeight: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  const viewPortrait = viewHeight > viewWidth;
  const imagePortrait = imageHeight > imageWidth;

  if (viewPortrait !== imagePortrait) {
    return viewPointToImagePoint(
      tapY,
      tapX,
      viewHeight,
      viewWidth,
      imageWidth,
      imageHeight,
    );
  }

  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
  const displayedWidth = imageWidth * scale;
  const displayedHeight = imageHeight * scale;
  const offsetX = (viewWidth - displayedWidth) / 2;
  const offsetY = (viewHeight - displayedHeight) / 2;

  return {
    x: (tapX - offsetX) / scale,
    y: (tapY - offsetY) / scale,
  };
}
