class Food extends Block {
    constructor(width, colour) {
        super(-50, -50, width, colour);
    }

    place(grid) {
        var block = grid.getUnoccupiedSafeBlock();
        this.x = block.x;
        this.y = block.y;
    }
}