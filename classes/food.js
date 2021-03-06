class Food extends Block {
  constructor(width, colour) {
    super(-50, -50, width, colour);
  }

  place(grid) {
    const block = grid.findUnoccupiedSafeBlock();
    this.x = block.x;
    this.y = block.y;
  }
}
