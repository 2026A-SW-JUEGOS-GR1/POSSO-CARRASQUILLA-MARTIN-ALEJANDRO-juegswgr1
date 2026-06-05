class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    create() {
        // Título y Subtítulo
        this.add.text(400, 100, 'KILLING TIME', { fontSize: '48px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(400, 180, 'Selecciona un Escenario:', { fontSize: '24px', fill: '#aaa' }).setOrigin(0.5);

        // Lista de Botones (Fíjate cómo el valor Y aumenta de 60 en 60)
        const btn1 = this.add.text(400, 260, '[ 1. Antigua Roma ]', { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5).setInteractive();
        const btn2 = this.add.text(400, 320, '[ 2. Antiguo Egipto ]', { fontSize: '32px', fill: '#ffcc00' }).setOrigin(0.5).setInteractive();
        const btn3 = this.add.text(400, 380, '[ 3. Japón Feudal ]', { fontSize: '32px', fill: '#ff00ff' }).setOrigin(0.5).setInteractive();
        const btn4 = this.add.text(400, 440, '[ 4. Fortaleza Medieval ]', { fontSize: '32px', fill: '#00ffff' }).setOrigin(0.5).setInteractive();

        // Funciones al hacer clic
        btn1.on('pointerdown', () => this.scene.start('Level1'));
        btn2.on('pointerdown', () => this.scene.start('Level2'));
        btn3.on('pointerdown', () => this.scene.start('Level3'));
        btn4.on('pointerdown', () => this.scene.start('Level4'));

        // Efecto visual: Cambiar a blanco al pasar el mouse por encima
        [btn1, btn2, btn3, btn4].forEach(btn => {
            let originalColor = btn.style.color;
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: originalColor }));
        });
    }
}