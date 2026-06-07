class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.result = data.result; // 'win' o 'lose'
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        let message = '';
        let color = '';

        if (this.result === 'win') {
            // Vi en tu captura que cambiaste el nombre a "roly", así que lo actualicé aquí
            message = '¡VICTORIA!\nroly recuperó su magia.';
            color = '#0f0';
            this.sound.play('win');
        } else {
            message = '¡FIN DEL TIEMPO!\nEl portal se cerró.';
            color = '#f00';
            this.sound.play('lose');
        }

        // Textos centrados dinámicamente y con un tamaño de fuente ajustado
        this.add.text(width / 2, height / 2 - 50, message, { fontSize: '32px', fill: color, align: 'center' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 80, 'Presiona [ESPACIO] para volver al menú', { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('MenuScene');
        });
    }
}