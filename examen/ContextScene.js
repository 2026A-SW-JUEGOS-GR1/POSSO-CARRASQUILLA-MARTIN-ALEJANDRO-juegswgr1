class ContextScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ContextScene' });
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Título de la escena
        this.add.text(width / 2, 50, 'HISTORIA Y CONTEXTO', { fontSize: '28px', fill: '#0af' }).setOrigin(0.5);

        // Texto de la narrativa
        const narrativa = 
            "Roly es una pequeña y ágil rana que ha perdido sus poderes\n" +
            "angelicales debido a un antiguo y misterioso hechizo.\n\n" +
            "Para recuperar su poder y energía, ha entrado en\n" +
            "Las Ruinas de Cristal, un ancestral laberinto de piedra.\n\n" +
            "Tu misión es guiarlo para recolectar todos los Fragmentos\n" +
            "de Cristal (Gemas) antes de que el portal de salida se\n" +
            "cierre para siempre. ¡Solo tienes 1 minuto!";

        this.add.text(width / 2, height / 2, narrativa, { 
            fontSize: '16px', 
            fill: '#fff', 
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Opción para regresar
        this.add.text(width / 2, height - 60, 'Presiona [ESC] para regresar al menú', { fontSize: '18px', fill: '#aaa' }).setOrigin(0.5);

        // Captura de teclado para volver al menú principal
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
    }
}