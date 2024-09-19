import React, { useEffect, useRef, useState, useContext } from "react";
import { Engine, Render, Runner, Bodies, Composite, Events } from "matter-js";
import electroIcon from "../assets/electro.png";
import ArrowRight from "../assets/ArrowRight.png";
import cx from "classnames";
import goldCoin from "../assets/goldCoin.svg";
import { UserContext } from "../App";

const Plinko = ({ handleGameChange }) => {
  const sceneRef = useRef(null);
  const [score, setScore] = useState(1);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [boostPoints, setBoostPoints] = useState(25);
  const engineRef = useRef(null); // Ref to hold the Matter.js engine instance
  const handleClickRef = useRef(null); // Ref to hold reference to handleClick function

  const [isShrunk, setIsShrunk] = useState(false);

  const { setPointsToUpdate, setTotalPoints } = useContext(UserContext);

  useEffect(() => {
    const worldWidth = 500;
    const worldHeight = 210;
    const startPins = 3;
    const pinLines = 6;
    const pinGapX = 45;
    const pinGapY = 35;

    const ballElasticity = 0.9;

    const maxPins = startPins + pinLines - 1;
    const pinGridWidth = maxPins * pinGapX;
    const pinGridHeight = (pinLines - 1) * pinGapY + 50;

    const engine = Engine.create({
      gravity: {
        scale: 0.0006,
      },
    });
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: worldWidth,
        height: worldHeight,
        wireframes: false,
        background: "transparent",
      },
    });

    const pins = [];
    for (let l = 0; l < pinLines; l++) {
      const linePins = startPins + l;
      const lineWidth = linePins * pinGapX;
      const startX = worldWidth / 2 - lineWidth / 2;

      for (let i = 0; i < linePins; i++) {
        const pinX = startX + i * pinGapX;
        const pinY = 20 + l * pinGapY;

        const pin = Bodies.circle(pinX, pinY, 3, {
          isStatic: true,
          render: { fillStyle: "#a9de84" },
        });
        pins.push(pin);
      }
    }

    Composite.add(engine.world, pins);

    const walls = [
      Bodies.rectangle(
        worldWidth / 2 - pinGridWidth / 2 - 18 + 70,
        worldHeight / 2 - 25,
        3,
        pinGridHeight * 1.2,
        {
          isStatic: true,
          render: { fillStyle: "transparent" },
          angle: -Math.PI / -6,
        }
      ),
      Bodies.rectangle(
        worldWidth / 2 + pinGridWidth / 2 - 10 - 80,
        worldHeight / 2 - 25,
        3,
        pinGridHeight * 1.2,
        {
          isStatic: true,
          render: { fillStyle: "transparent" },
          angle: Math.PI / -6,
        }
      ),
    ];
    Composite.add(engine.world, walls);

    const boxWidth = pinGapX;
    const boxHeight = pinGapX - 20;
    const boxGap = 1;
    const boxes = [];
    const boxY = worldHeight + 11;

    const boxMultipliers = [100, 50, 25, 10, 25, 50, 100];

    for (let i = 0; i < maxPins; i++) {
      if (i >= boxMultipliers.length) break;

      let fillStyle = "transparent";

      const boxX =
        worldWidth / 2 -
        pinGridWidth / 2 +
        i * (boxWidth + boxGap) +
        boxWidth / 2;

      const box = Bodies.rectangle(boxX, boxY, boxWidth, boxHeight, {
        isStatic: true,
        render: {
          fillStyle: fillStyle,
        },
        chamfer: {
          radius: [2, 2, 2, 2],
        },
        id: `box-${i}`, // Assign an id to each box for easy identification
      });
      box.multiplier = boxMultipliers[i];
      boxes.push(box);
    }

    Composite.add(engine.world, boxes);

    const dropBall = () => {
      const centerX = worldWidth / 2 - 27;
      const range = 20;
      const minX = centerX - range / 2;
      const maxX = centerX + range / 2;
      const randomX = Math.random() * (maxX - minX) + minX;
      const spawnY = 20;
      const ballRadius = 12;

      const imageWidth = 1000; // Replace with the actual width of your goldCoin image
      const imageHeight = 1000;

      const newBall = Bodies.circle(randomX, spawnY, ballRadius, {
        restitution: ballElasticity,
        collisionFilter: {
          group: 0, // Negative group value ensures balls don't collide with each other
        },
        render: {
          sprite: {
            texture: goldCoin, // Use the imported SVG as texture
            xScale: (ballRadius * 2) / imageWidth, // Scale to match ball diameter
            yScale: (ballRadius * 2) / imageHeight,
          },
          // Set the fill style to transparent to only show the image
          fillStyle: "red",
        },
      });
      Composite.add(engine.world, [newBall]);

      Events.on(engine, "collisionStart", (event) => {
        const pairs = event.pairs;
        pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          if (
            (bodyA === newBall && boxes.includes(bodyB)) ||
            (bodyB === newBall && boxes.includes(bodyA))
          ) {
            const hitBox = boxes.find((box) => box === bodyA || box === bodyB);
            setScore((prevScore) => prevScore + hitBox.multiplier);
            setTotalPoints((prev) => prev + score);
            setPointsToUpdate((prev) => prev + score);
            Composite.remove(engine.world, newBall);
          }
        });
      });
    };

    const handleClick = () => {
      setIsShrunk(true);
      const now = Date.now();

      const button = document.getElementById("drop-ball-button");
      button.classList.add("shrink");

      setBoostPoints((prevBoostPoints) => {
        if (prevBoostPoints === 0 || prevBoostPoints === 1) {
          return prevBoostPoints;
        }
        dropBall();
        setLastClickTime(now);
        return prevBoostPoints - 1;
      });

      setTimeout(() => {
        setIsShrunk(false);
      }, 200);
    };

    handleClickRef.current = handleClick;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const button = document.getElementById("drop-ball-button");
    button.addEventListener("click", handleClickRef.current);

    return () => {
      button.removeEventListener("click", handleClickRef.current);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, [score, setPointsToUpdate, setTotalPoints]);

  useEffect(() => {
    const incrementBoostPoints = () => {
      setBoostPoints((prev) => Math.min(prev + 1, 25));
    };

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastClickTime >= 1000) {
        incrementBoostPoints();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClickTime, score, setTotalPoints]);

  const renderBoxes = () => {
    const maxPins = 10; // Adjust this based on your requirement
    const boxMultipliers = [100, 50, 25, 10, 25, 50, 100];

    return (
      <>
        {boxMultipliers.slice(0, maxPins).map((multiplier, index) => (
          <div
            key={index}
            className="pin-box"
            id={`box-${index}`} // Match the id with the Matter.js body id
            style={{
              width: `${45}px`,
              height: `${25}px`,
              backgroundColor:
                index === 0 || index === maxPins - 2
                  ? "#FF302F"
                  : index === 1 || index === maxPins - 3
                  ? "#FE601F"
                  : index === 2 || index === maxPins - 4
                  ? "#FEA907"
                  : "#FEC200",
              borderRadius: "2px",
              zIndex: 100,
              color: "white",
              fontWeight: "bold",
              bottom: "66px",
              textAlign: "center",
              left: `${91 + index * (45 + 1)}px`,
            }}
          >
            {multiplier}x
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="w-full flex flex-col pt-[40px] pb-[0px] font-inter justify-between items-center h-full gap-0 relative">
      <div className="flex flex-col w-full items-center justify-center pl-[50px] mt-[20px] ">
        <div ref={sceneRef} className="z-[1]" />
        {/* Render boxes using JSX */}
        <div className="flex  w-full justify-center items-center] ml-[-40px]  gap-[2px]">
          {renderBoxes()}
        </div>
      </div>

      <div
        className="absolute top-[41%] left-[20px] rotate-180 z-[100]"
        onClick={handleGameChange}
      >
        <img src={ArrowRight} alt="arrow" className="h-[36px]" />
      </div>
      <div className="flex px-[40px] z-[100] w-full absolute bottom-0">
        <button
          id="drop-ball-button"
          className={cx(
            "text-center text-[#000000] flex items-center justify-center bg-[#98E178] h-[42px] w-full rounded-[10px] gap-[10px] transition-transform duration-500 ease-in-out",
            { "scale-95": isShrunk }
          )}
        >
          <img src={electroIcon} alt="electro" className="h-[23px] w-[20px]" />
          <span className="text-[16px] font-bold">{boostPoints} / 25</span>
        </button>
      </div>
    </div>
  );
};

export default Plinko;
