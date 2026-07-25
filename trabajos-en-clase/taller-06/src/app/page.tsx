"use client";

import { useEffect, useRef } from "react";

import { Engine } from "@babylonjs/core/Engines/engine";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Collisions/collisionCoordinator";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvasRef.current) {
			return;
		}

		const engine = new Engine(canvasRef.current, true, {
			stencil: true,
			antialias: true,
			audioEngine: true,
			adaptToDeviceRatio: true,
			disableWebGL2Support: false,
			useHighPrecisionFloats: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
		});

		const scene = new Scene(engine);
		scene.clearColor = new Color4(0.05, 0.05, 0.12, 1);
		scene.ambientColor = new Color3(0.08, 0.08, 0.1);
		scene.collisionsEnabled = true;

		const { player } = createHouseTourScene(scene);

		const camera = new ArcRotateCamera(
			"tourCamera",
			Math.PI / 2,
			Math.PI / 2.35,
			7,
			new Vector3(0, 1.4, 0),
			scene,
		);
		camera.lowerRadiusLimit = 4;
		camera.upperRadiusLimit = 10;
		camera.lowerBetaLimit = 0.5;
		camera.upperBetaLimit = 1.5;
		camera.keysLeft = [37];
		camera.keysRight = [39];
		camera.keysUp = [38];
		camera.keysDown = [40];
		camera.attachControl();
		scene.activeCamera = camera;

		const pressedKeys = new Set<string>();
		const handleKeyDown = (event: KeyboardEvent) => {
			pressedKeys.add(event.key.toLowerCase());
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			pressedKeys.delete(event.key.toLowerCase());
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		const moveSpeed = 6.5;
		const turnSpeed = 2.8;
		const cameraTargetOffset = new Vector3(0, 1.0, 0);

		// ── Gravity & jump state ──
		const gravity = -20;
		const jumpStrength = 7.5;
		let verticalVelocity = 0;
		let isGrounded = true;

		engine.runRenderLoop(() => {
			const deltaSeconds = engine.getDeltaTime() / 1000;

			let turnInput = 0;
			if (pressedKeys.has("a")) {
				turnInput -= 1;
			}
			if (pressedKeys.has("d")) {
				turnInput += 1;
			}
			player.rotation.y += turnInput * turnSpeed * deltaSeconds;

			let moveInput = 0;
			if (pressedKeys.has("w")) {
				moveInput += 1;
			}
			if (pressedKeys.has("s")) {
				moveInput -= 1;
			}

			// Horizontal movement
			let isMoving = false;
			if (moveInput !== 0 || turnInput !== 0) {
				isMoving = true;
			}

			if (moveInput !== 0) {
				const forward = new Vector3(
					Math.sin(player.rotation.y),
					0,
					Math.cos(player.rotation.y),
				);
				player.moveWithCollisions(forward.scale(moveInput * moveSpeed * deltaSeconds));
			}

			// Handle animations
			if (player.metadata && player.metadata.walkAnim && player.metadata.idleAnim) {
				const walkAnim = player.metadata.walkAnim;
				const idleAnim = player.metadata.idleAnim;
				if (isMoving) {
					if (!walkAnim.isPlaying) {
						idleAnim.stop();
						walkAnim.play(true);
					}
				} else {
					if (!idleAnim.isPlaying) {
						walkAnim.stop();
						idleAnim.play(true);
					}
				}
			}

			// Jump (spacebar)
			if (pressedKeys.has(" ") && isGrounded) {
				verticalVelocity = jumpStrength;
				isGrounded = false;
			}

			// Apply gravity to velocity
			verticalVelocity += gravity * deltaSeconds;

			const verticalMove = new Vector3(0, verticalVelocity * deltaSeconds, 0);
			const previousY = player.position.y;

			// Move vertically using Babylon's collision system
			player.moveWithCollisions(verticalMove);

			// Ground and ceiling detection
			if (verticalVelocity <= 0) {
				// Falling or resting
				const expectedY = previousY + verticalMove.y;
				// If our actual Y is higher than expected, a collision stopped us from falling further
				if (player.position.y > expectedY + 0.001) {
					verticalVelocity = 0;
					isGrounded = true;
				} else {
					isGrounded = false;
				}
			} else {
				// Jumping up
				isGrounded = false;
				const expectedY = previousY + verticalMove.y;
				// If our actual Y is lower than expected, we hit a ceiling
				if (player.position.y < expectedY - 0.001) {
					verticalVelocity = 0;
				}
			}

			// Safety floor clamp
			if (player.position.y < 0.9) {
				player.position.y = 0.9;
				verticalVelocity = 0;
				isGrounded = true;
			}

			camera.setTarget(player.position.add(cameraTargetOffset));

			scene.render();
		});

		const handleResize = () => {
			engine.resize();
		};
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("resize", handleResize);
			engine.stopRenderLoop();
			scene.dispose();
			engine.dispose();
		};
	}, []);

	return (
		<main className="flex h-screen w-screen flex-col items-center justify-between bg-slate-950">
			<canvas
				ref={canvasRef}
				className="h-full w-full select-none outline-none"
			/>
		</main>
	);
}

function createHouseTourScene(scene: Scene) {
	const groundMaterial = new StandardMaterial("groundMaterial", scene);
	groundMaterial.diffuseColor = new Color3(0.78, 0.76, 0.7);

	const wallMaterial = new StandardMaterial("wallMaterial", scene);
	wallMaterial.diffuseColor = new Color3(0.86, 0.84, 0.8);

	const roofMaterial = new StandardMaterial("roofMaterial", scene);
	roofMaterial.diffuseColor = new Color3(0.72, 0.36, 0.24);

	const stairMaterial = new StandardMaterial("stairMaterial", scene);
	stairMaterial.diffuseColor = new Color3(0.58, 0.49, 0.39);

	const playerMaterial = new StandardMaterial("playerMaterial", scene);
	playerMaterial.diffuseColor = new Color3(0.2, 0.55, 0.95);

	const accentMaterial = new StandardMaterial("accentMaterial", scene);
	accentMaterial.diffuseColor = new Color3(0.95, 0.84, 0.48);

	const windowMaterial = new StandardMaterial("windowMaterial", scene);
	windowMaterial.diffuseColor = new Color3(0.6, 0.78, 0.9);
	windowMaterial.alpha = 0.35;

	const ground = MeshBuilder.CreateGround(
		"ground",
		{
			width: 80,
			height: 80,
			subdivisions: 2,
		},
		scene,
	);
	ground.material = groundMaterial;
	ground.checkCollisions = true;

	// ── House dimensions ──
	const houseWidth = 30;        // X-axis
	const houseDepth = 24;        // Z-axis
	const wallHeight = 4;
	const floorThickness = 0.25;
	const wallThickness = 0.35;

	// ── Helper ──
	const createWall = (name: string, width: number, height: number, depth: number, position: Vector3) => {
		const wall = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
		wall.position.copyFrom(position);
		wall.material = wallMaterial;
		wall.checkCollisions = true;
		return wall;
	};

	// ── Stairwell dimensions (inside the house, back-right corner) ──
	const stairWidth = 4.5;    // X extent of the stairwell
	const stairDepth = 10;     // Z extent of the stairwell (longer = gentler slope)
	const stairwellXMin = houseWidth / 2 - stairWidth;
	const stairwellXMax = houseWidth / 2;
	const stairwellZMin = -houseDepth / 2;
	const stairwellZMax = -houseDepth / 2 + stairDepth;

	// ── Ground Floor (base slab) ──
	const lowerFloor = MeshBuilder.CreateBox("lowerFloor", {
		width: houseWidth,
		height: floorThickness,
		depth: houseDepth,
	}, scene);
	lowerFloor.position.y = floorThickness / 2;
	lowerFloor.material = roofMaterial;
	lowerFloor.checkCollisions = true;

	// ── Upper Floor — split into pieces leaving a stairwell hole ──
	// Piece 1: the full-width strip in front of the stairwell (Z from stairwellZMax to houseDepth/2)
	const uf1Width = houseWidth;
	const uf1Depth = houseDepth / 2 - stairwellZMax + houseDepth / 2;   // from stairwellZMax to front
	const uf1DepthActual = houseDepth - stairDepth; // 10
	const uf1 = MeshBuilder.CreateBox("upperFloor1", {
		width: uf1Width,
		height: floorThickness,
		depth: uf1DepthActual,
	}, scene);
	uf1.position.set(0, wallHeight + floorThickness / 2, stairwellZMax + uf1DepthActual / 2);
	uf1.material = roofMaterial;
	uf1.checkCollisions = true;

	// Piece 2: the strip to the LEFT of the stairwell (same Z-range as stairwell)
	const uf2Width = houseWidth - stairWidth;  // 16.5
	const uf2 = MeshBuilder.CreateBox("upperFloor2", {
		width: uf2Width,
		height: floorThickness,
		depth: stairDepth,
	}, scene);
	uf2.position.set(
		-houseWidth / 2 + uf2Width / 2,
		wallHeight + floorThickness / 2,
		stairwellZMin + stairDepth / 2,
	);
	uf2.material = roofMaterial;
	uf2.checkCollisions = true;

	// ── Roof ──
	const roof = MeshBuilder.CreateBox("roof", {
		width: houseWidth + 0.6,
		height: floorThickness,
		depth: houseDepth + 0.6,
	}, scene);
	roof.position.y = wallHeight * 2 + floorThickness / 2;
	roof.material = roofMaterial;
	roof.checkCollisions = true;

	// ══════════════════════════════════════
	// GROUND-FLOOR WALLS  (Y center = wallHeight / 2 = 2)
	// ══════════════════════════════════════
	const gY = wallHeight / 2 + floorThickness;

	// — Front wall (Z = +houseDepth/2) — split for door opening —
	// Door: 2.4 wide × 3.2 tall, centred at X=0
	const doorW = 2.4;
	const doorH = 3.2;
	const frontZ = houseDepth / 2;
	// left segment
	const fLeftW = (houseWidth - doorW) / 2;
	createWall("gFrontL", fLeftW, wallHeight, wallThickness,
		new Vector3(-houseWidth / 2 + fLeftW / 2, gY, frontZ));
	// right segment
	createWall("gFrontR", fLeftW, wallHeight, wallThickness,
		new Vector3(houseWidth / 2 - fLeftW / 2, gY, frontZ));
	// lintel above door
	const lintelH = wallHeight - doorH;
	createWall("gFrontLintel", doorW, lintelH, wallThickness,
		new Vector3(0, gY + wallHeight / 2 - lintelH / 2, frontZ));

	// — Back wall (Z = -houseDepth/2) — full width, with window ——
	// Window: 2.4 wide × 1.6 tall, sill at 1.0 from floor, centred at X = -3
	const backZ = -houseDepth / 2;
	const bwWinX = -3;
	const bwWinW = 2.4;
	const bwWinH = 1.6;
	const bwSill = 1.0;
	// left of window
	const bwLeftW = (houseWidth / 2 + bwWinX) - bwWinW / 2;
	createWall("gBackL", bwLeftW, wallHeight, wallThickness,
		new Vector3(-houseWidth / 2 + bwLeftW / 2, gY, backZ));
	// right of window
	const bwRightStart = bwWinX + bwWinW / 2;
	const bwRightW = houseWidth / 2 - bwRightStart;
	createWall("gBackR", bwRightW, wallHeight, wallThickness,
		new Vector3(bwRightStart + bwRightW / 2, gY, backZ));
	// below window
	createWall("gBackBelow", bwWinW, bwSill, wallThickness,
		new Vector3(bwWinX, gY - wallHeight / 2 + bwSill / 2, backZ));
	// above window
	const bwAboveH = wallHeight - bwSill - bwWinH;
	createWall("gBackAbove", bwWinW, bwAboveH, wallThickness,
		new Vector3(bwWinX, gY + wallHeight / 2 - bwAboveH / 2, backZ));
	// window pane
	const bwPane = MeshBuilder.CreateBox("gBackWinPane", { width: bwWinW, height: bwWinH, depth: 0.05 }, scene);
	bwPane.position.set(bwWinX, gY - wallHeight / 2 + bwSill + bwWinH / 2, backZ);
	bwPane.material = windowMaterial;

	// — Left wall (X = -houseWidth/2) — with window ——
	const leftX = -houseWidth / 2;
	const lwWinZ = 0;
	const lwWinW = 2.4;
	const lwWinH = 1.6;
	const lwSill = 1.0;
	const lwFrontD = houseDepth / 2 - (lwWinZ + lwWinW / 2);
	const lwBackD = (lwWinZ - lwWinW / 2) + houseDepth / 2;
	createWall("gLeftFront", wallThickness, wallHeight, lwFrontD,
		new Vector3(leftX, gY, houseDepth / 2 - lwFrontD / 2));
	createWall("gLeftBack", wallThickness, wallHeight, lwBackD,
		new Vector3(leftX, gY, -houseDepth / 2 + lwBackD / 2));
	createWall("gLeftBelow", wallThickness, lwSill, lwWinW,
		new Vector3(leftX, gY - wallHeight / 2 + lwSill / 2, lwWinZ));
	const lwAboveH = wallHeight - lwSill - lwWinH;
	createWall("gLeftAbove", wallThickness, lwAboveH, lwWinW,
		new Vector3(leftX, gY + wallHeight / 2 - lwAboveH / 2, lwWinZ));
	const lwPane = MeshBuilder.CreateBox("gLeftWinPane", { width: 0.05, height: lwWinH, depth: lwWinW }, scene);
	lwPane.position.set(leftX, gY - wallHeight / 2 + lwSill + lwWinH / 2, lwWinZ);
	lwPane.material = windowMaterial;

	// — Right wall (X = +houseWidth/2) — with window ——
	const rightX = houseWidth / 2;
	const rwWinZ = 2;
	const rwWinW = 2.4;
	const rwWinH = 1.6;
	const rwSill = 1.0;
	const rwFrontD = houseDepth / 2 - (rwWinZ + rwWinW / 2);
	const rwBackD = (rwWinZ - rwWinW / 2) + houseDepth / 2;
	createWall("gRightFront", wallThickness, wallHeight, rwFrontD,
		new Vector3(rightX, gY, houseDepth / 2 - rwFrontD / 2));
	createWall("gRightBack", wallThickness, wallHeight, rwBackD,
		new Vector3(rightX, gY, -houseDepth / 2 + rwBackD / 2));
	createWall("gRightBelow", wallThickness, rwSill, rwWinW,
		new Vector3(rightX, gY - wallHeight / 2 + rwSill / 2, rwWinZ));
	const rwAboveH = wallHeight - rwSill - rwWinH;
	createWall("gRightAbove", wallThickness, rwAboveH, rwWinW,
		new Vector3(rightX, gY + wallHeight / 2 - rwAboveH / 2, rwWinZ));
	const rwPane = MeshBuilder.CreateBox("gRightWinPane", { width: 0.05, height: rwWinH, depth: rwWinW }, scene);
	rwPane.position.set(rightX, gY - wallHeight / 2 + rwSill + rwWinH / 2, rwWinZ);
	rwPane.material = windowMaterial;

	// ══════════════════════════════════════
	// UPPER-FLOOR WALLS  (Y center offset by wallHeight)
	// ══════════════════════════════════════
	const uY = wallHeight + wallHeight / 2 + floorThickness;

	// — Upper front wall — with window ——
	const ufWinX = 0;
	const ufWinW = 3.0;
	const ufWinH = 1.6;
	const ufSill = 1.0;
	const ufLeftW = (houseWidth - ufWinW) / 2;
	createWall("uFrontL", ufLeftW, wallHeight, wallThickness,
		new Vector3(-houseWidth / 2 + ufLeftW / 2, uY, frontZ));
	createWall("uFrontR", ufLeftW, wallHeight, wallThickness,
		new Vector3(houseWidth / 2 - ufLeftW / 2, uY, frontZ));
	createWall("uFrontBelow", ufWinW, ufSill, wallThickness,
		new Vector3(ufWinX, uY - wallHeight / 2 + ufSill / 2, frontZ));
	const ufAboveH = wallHeight - ufSill - ufWinH;
	createWall("uFrontAbove", ufWinW, ufAboveH, wallThickness,
		new Vector3(ufWinX, uY + wallHeight / 2 - ufAboveH / 2, frontZ));
	const ufPane = MeshBuilder.CreateBox("uFrontWinPane", { width: ufWinW, height: ufWinH, depth: 0.05 }, scene);
	ufPane.position.set(ufWinX, uY - wallHeight / 2 + ufSill + ufWinH / 2, frontZ);
	ufPane.material = windowMaterial;

	// — Upper back wall — with window ——
	const ubWinX = -3;
	const ubWinW = 2.4;
	const ubWinH = 1.6;
	const ubSill = 1.0;
	const ubLeftW = (houseWidth / 2 + ubWinX) - ubWinW / 2;
	createWall("uBackL", ubLeftW, wallHeight, wallThickness,
		new Vector3(-houseWidth / 2 + ubLeftW / 2, uY, backZ));
	const ubRightStart = ubWinX + ubWinW / 2;
	const ubRightW = houseWidth / 2 - ubRightStart;
	createWall("uBackR", ubRightW, wallHeight, wallThickness,
		new Vector3(ubRightStart + ubRightW / 2, uY, backZ));
	createWall("uBackBelow", ubWinW, ubSill, wallThickness,
		new Vector3(ubWinX, uY - wallHeight / 2 + ubSill / 2, backZ));
	const ubAboveH = wallHeight - ubSill - ubWinH;
	createWall("uBackAbove", ubWinW, ubAboveH, wallThickness,
		new Vector3(ubWinX, uY + wallHeight / 2 - ubAboveH / 2, backZ));
	const ubPane = MeshBuilder.CreateBox("uBackWinPane", { width: ubWinW, height: ubWinH, depth: 0.05 }, scene);
	ubPane.position.set(ubWinX, uY - wallHeight / 2 + ubSill + ubWinH / 2, backZ);
	ubPane.material = windowMaterial;

	// — Upper left wall — with window ——
	const ulWinZ = 0;
	const ulWinW = 2.4;
	const ulWinH = 1.6;
	const ulSill = 1.0;
	const ulFrontD = houseDepth / 2 - (ulWinZ + ulWinW / 2);
	const ulBackD = (ulWinZ - ulWinW / 2) + houseDepth / 2;
	createWall("uLeftFront", wallThickness, wallHeight, ulFrontD,
		new Vector3(leftX, uY, houseDepth / 2 - ulFrontD / 2));
	createWall("uLeftBack", wallThickness, wallHeight, ulBackD,
		new Vector3(leftX, uY, -houseDepth / 2 + ulBackD / 2));
	createWall("uLeftBelow", wallThickness, ulSill, ulWinW,
		new Vector3(leftX, uY - wallHeight / 2 + ulSill / 2, ulWinZ));
	const ulAboveH = wallHeight - ulSill - ulWinH;
	createWall("uLeftAbove", wallThickness, ulAboveH, ulWinW,
		new Vector3(leftX, uY + wallHeight / 2 - ulAboveH / 2, ulWinZ));
	const ulPane = MeshBuilder.CreateBox("uLeftWinPane", { width: 0.05, height: ulWinH, depth: ulWinW }, scene);
	ulPane.position.set(leftX, uY - wallHeight / 2 + ulSill + ulWinH / 2, ulWinZ);
	ulPane.material = windowMaterial;

	// — Upper right wall — with window ——
	const urWinZ = 2;
	const urWinW = 2.4;
	const urWinH = 1.6;
	const urSill = 1.0;
	const urFrontD = houseDepth / 2 - (urWinZ + urWinW / 2);
	const urBackD = (urWinZ - urWinW / 2) + houseDepth / 2;
	createWall("uRightFront", wallThickness, wallHeight, urFrontD,
		new Vector3(rightX, uY, houseDepth / 2 - urFrontD / 2));
	createWall("uRightBack", wallThickness, wallHeight, urBackD,
		new Vector3(rightX, uY, -houseDepth / 2 + urBackD / 2));
	createWall("uRightBelow", wallThickness, urSill, urWinW,
		new Vector3(rightX, uY - wallHeight / 2 + urSill / 2, urWinZ));
	const urAboveH = wallHeight - urSill - urWinH;
	createWall("uRightAbove", wallThickness, urAboveH, urWinW,
		new Vector3(rightX, uY + wallHeight / 2 - urAboveH / 2, urWinZ));
	const urPane = MeshBuilder.CreateBox("uRightWinPane", { width: 0.05, height: urWinH, depth: urWinW }, scene);
	urPane.position.set(rightX, uY - wallHeight / 2 + urSill + urWinH / 2, urWinZ);
	urPane.material = windowMaterial;

	// ══════════════════════════════════════
	// INTERIOR STAIRCASE  (back-right corner, inside the house)
	// ══════════════════════════════════════
	const stairCount = 16;
	const stepHeight = wallHeight / stairCount;
	const stepWidth = stairWidth;
	const stepDepth = stairDepth / stairCount;
	const stairBaseX = stairwellXMin + stairWidth / 2;
	const stairBaseZ = stairwellZMin;

	for (let i = 0; i < stairCount; i++) {
		const step = MeshBuilder.CreateBox(`stairStep${i}`, {
			width: stepWidth,
			height: stepHeight,
			depth: stepDepth,
		}, scene);
		step.position.set(
			stairBaseX,
			floorThickness + stepHeight / 2 + i * stepHeight,
			stairBaseZ + stepDepth / 2 + i * stepDepth,
		);
		step.material = stairMaterial;
		step.checkCollisions = true;
	}

	// Invisible ramp for smooth upward collision sliding (thin slab rotated to slope angle)
	const rampLength = Math.sqrt(stairDepth * stairDepth + wallHeight * wallHeight);
	const rampAngle = Math.atan2(wallHeight, stairDepth);
	const stairRamp = MeshBuilder.CreateBox("stairRamp", {
		width: stepWidth,
		height: 0.15,
		depth: rampLength,
	}, scene);
	stairRamp.rotation.x = -rampAngle;
	stairRamp.position.set(
		stairBaseX,
		floorThickness + wallHeight / 2,
		stairwellZMin + stairDepth / 2,
	);
	stairRamp.visibility = 0;
	stairRamp.isPickable = false;
	stairRamp.checkCollisions = true;

	// Stairwell guard-wall on the open side (left side of stairwell on upper floor)
	createWall("stairGuard", wallThickness, wallHeight * 0.5, stairDepth,
		new Vector3(stairwellXMin, wallHeight + wallHeight * 0.25 + floorThickness, stairwellZMin + stairDepth / 2));

	// ══════════════════════════════════════
	// LIGHTS & LAMPS
	// ══════════════════════════════════════

	// Dim ambient so the outdoor area is dark
	const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), scene);
	ambientLight.intensity = 0.08;
	ambientLight.diffuse = new Color3(0.15, 0.15, 0.25);
	ambientLight.groundColor = new Color3(0.05, 0.05, 0.08);

	// ── Lower-floor point light (warm) ──
	const lowerPointLight = new PointLight("lowerPointLight",
		new Vector3(0, wallHeight * 0.8 + floorThickness, 0), scene);
	lowerPointLight.intensity = 1.4;
	lowerPointLight.diffuse = new Color3(1, 0.92, 0.75);
	lowerPointLight.range = houseWidth * 1.2;

	// ── Upper-floor point light (cool) ──
	const upperPointLight = new PointLight("upperPointLight",
		new Vector3(0, wallHeight + wallHeight * 0.8 + floorThickness, 0), scene);
	upperPointLight.intensity = 1.4;
	upperPointLight.diffuse = new Color3(0.8, 0.9, 1);
	upperPointLight.range = houseWidth * 1.2;

	// Glowing lamp material
	const lampGlowMaterial = new StandardMaterial("lampGlowMaterial", scene);
	lampGlowMaterial.diffuseColor = new Color3(1, 0.95, 0.7);
	lampGlowMaterial.emissiveColor = new Color3(1, 0.9, 0.5);

	const lowerFloorLamp = MeshBuilder.CreateBox("lowerFloorLamp", {
		width: 0.5,
		height: 0.5,
		depth: 0.5,
	}, scene);
	lowerFloorLamp.position.set(0, wallHeight * 0.8 + floorThickness, 0);
	lowerFloorLamp.material = lampGlowMaterial;

	const upperFloorLamp = MeshBuilder.CreateBox("upperFloorLamp", {
		width: 0.5,
		height: 0.5,
		depth: 0.5,
	}, scene);
	upperFloorLamp.position.set(0, wallHeight + wallHeight * 0.8 + floorThickness, 0);
	upperFloorLamp.material = lampGlowMaterial;

	// ══════════════════════════════════════
	// PLAYER
	// ══════════════════════════════════════
	const player = MeshBuilder.CreateBox("player", {
		width: 0.9,
		height: 1.8,
		depth: 0.9,
	}, scene);
	// Spawn outside, in front of the door
	player.position.set(0, 1.0, houseDepth / 2 + 3);
	player.material = playerMaterial;
	player.checkCollisions = true;
	player.ellipsoid = new Vector3(0.4, 0.9, 0.4);
	player.ellipsoidOffset = new Vector3(0, 0, 0);

	// Hide the collision box and prepare metadata for animations
	player.isVisible = false;
	player.metadata = { walkAnim: null, idleAnim: null };

	// Load the GLB character model
	SceneLoader.ImportMeshAsync("", "/", "azure_glb_2anima.glb", scene).then((result) => {
		const root = result.meshes[0];
		root.parent = player;

		// Lower the model to the bottom of the 1.8h collision box
		root.position.y = -0.9;

		// Scale the model to 75% of its original size
		root.scaling = new Vector3(0.75, 0.75, 0.75);

		// Reset rotation (model natively faces forward)
		root.rotationQuaternion = null;
		root.rotation = new Vector3(0, 0, 0);

		// Stop all auto-playing animations first
		result.animationGroups.forEach(anim => anim.stop());

		const idleAnim = result.animationGroups.find(a => a.name === "mixamo.com.001");
		const walkAnim = result.animationGroups.find(a => a.name === "mixamo.com");

		if (idleAnim) {
			idleAnim.play(true);
		}

		player.metadata.walkAnim = walkAnim;
		player.metadata.idleAnim = idleAnim;
	});

	return { player };
}
