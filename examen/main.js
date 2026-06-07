const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 480,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Cero gravedad para vista Top-Down
            debug: false
        }
    },
    scene: [MenuScene, ContextScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);