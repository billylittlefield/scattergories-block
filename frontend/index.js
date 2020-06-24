import {
	initializeBlock,
	Heading,
	Text,
	Box,
	useSession,
	Button,
	useBase,
	useRecords,
} from "@airtable/blocks/ui";
import React, { useState, useEffect, useRef } from "react";
import _ from "lodash";

function useInterval(callback, delay) {
	const savedCallback = useRef();

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			savedCallback.current();
		}
		if (delay !== null) {
			let id = setInterval(tick, delay);
			return () => clearInterval(id);
		}
	}, [delay]);
}
const allLetters = [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
];

const spentLetters = [];

function HelloWorldBlock() {
	const [currentLetter, setCurrentLetter] = useState("-");
	const [currentRound, setCurrentRound] = useState(0);
	const [isRoundActive, setIsRoundActive] = useState(false);
	const [timeLeft, setTimeLeft] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const session = useSession();
	const isAdmin = (session.currentUser.name = "Billy Littlefield");
	const base = useBase();

	const categoriesTable = base.getTableByNameIfExists("Categories");
	const answersTable = base.getTableByNameIfExists("Answers");
	const answers = useRecords(answersTable);
	const availableCategories = useRecords(categoriesTable.getViewByName("Available answers"));

	function nextRound() {
		const newRound = currentRound + 1;
		const randomLetter = _.sample(_.difference(allLetters, spentLetters));
		spentLetters.push(randomLetter);

		const creations = [];
		const updates = [];
		for (let i = 0; i < 10; i++) {
			const newCategoryRecord = _.sample(availableCategories);
			creations.push({
				fields: {
					Category: newCategoryRecord.getCellValue("Category"),
					Letter: randomLetter,
					"Is active?": true,
					Round: newRound,
				},
			});
			updates.push({
				id: newCategoryRecord.id,
				fields: {
					"Used?": true,
				},
			});
		}

		answersTable.createRecordsAsync(creations);
		categoriesTable.updateRecordsAsync(updates);

		setCurrentLetter(randomLetter);
		setCurrentRound(newRound);
		setTimeLeft(120);
		setIsRoundActive(true);
	}

	if (timeLeft === 0 && isRoundActive) {
		setIsRoundActive(false);
		let updates = answers.map((cat) => {
			return {
				id: cat.id,
				fields: {
					"Is active?": false,
				},
			};
		});

		while (updates.length > 0) {
			answersTable.updateRecordsAsync(updates.slice(0, 50));
			updates = updates.slice(50);
		}
	}

	useInterval(() => {
		if (timeLeft > 0 && !isPaused) {
			setTimeLeft(timeLeft - 1);
		}
	}, 1000);

	function pauseOrResume() {
		setIsPaused(!isPaused);
	}

	return (
		<Box
			padding={3}
			position="absolute"
			left="0"
			right="0"
			bottom="0"
			top="0"
			display="flex"
			flexDirection="column"
		>
			<Box display="flex" flex="auto" flexDirection="column">
				<Heading size="large">Scattergories</Heading>
				<Box display="flex" flex="auto" justifyContent="space-around" alignItems="center">
					{isRoundActive ? (
						<React.Fragment>
							<LabelValuePair label="Round" value={currentRound} />
							<LabelValuePair label="Time left" value={timeLeft} />
							<LabelValuePair label="Letter" value={currentLetter} />
						</React.Fragment>
					) : (
						"Next round starting soon.."
					)}
				</Box>
			</Box>
			<Box display="flex" flex="none">
				<Box flex="none">
					{isAdmin && <Button onClick={nextRound}>Start next round</Button>}
				</Box>
				<Box flex="none">
					{isAdmin && (
						<Button marginLeft={2} onClick={pauseOrResume}>
							{isPaused ? "Resume" : "Pause"}
						</Button>
					)}
				</Box>
			</Box>
		</Box>
	);
}

function LabelValuePair({ label, value }) {
	return (
		<Box display="flex" alignItems="center" flexDirection="column">
			<Text size="default">{label}</Text>
			<Heading size="large" marginTop={2}>
				{value}
			</Heading>
		</Box>
	);
}

initializeBlock(() => <HelloWorldBlock />);
