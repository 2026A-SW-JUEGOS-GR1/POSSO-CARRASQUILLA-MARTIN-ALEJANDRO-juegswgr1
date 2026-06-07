const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: true // Cambia a true para ver las cajas de colisión
        }
    },
    // Cargamos nuestras escenas
    scene: [MainMenu, Level1, Level2, Level3, Level4] 
};

const game = new Phaser.Game(config);