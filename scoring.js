const dimensionKeys = Object.keys(figures);

function optionPoints(pair, key) {
  if (pair[0] === key) return 2;
  return Number(pair[1] === key);
}

const scoreLimits = Object.fromEntries(dimensionKeys.map(key => {
  const possible = questions.map(({ options }) => Math.max(...options.map(([, pair]) => optionPoints(pair, key))));
  const maxPoints = possible.reduce((sum, points) => sum + points, 0);
  const maxPrimary = possible.filter(points => points === 2).length;
  return [key, { maxPoints, maxPrimary }];
}));

function isValidChoice(index, choice) {
  return Number.isInteger(choice) && choice >= 0 && choice < questions[index].options.length;
}

function scoreAnswers(answers) {
  if (answers.length !== questions.length ||
      !questions.every((_, index) => isValidChoice(index, answers[index]))) {
    throw new RangeError("请先完成所有题目");
  }

  const selections = questions.map(({ options }, index) => options[answers[index]][1]);
  const entries = dimensionKeys.map((key, order) => {
    const { maxPoints, maxPrimary } = scoreLimits[key];
    const coveredScenes = new Set();
    let points = 0;
    let primary = 0;
    selections.forEach((pair, index) => {
      const value = optionPoints(pair, key);
      points += value;
      if (value === 2) {
        primary += 1;
        coveredScenes.add(questions[index].title);
      }
    });
    return {
      key, order, points, primary, maxPoints, maxPrimary, breadth: coveredScenes.size,
      score: Number((100 * points / maxPoints).toFixed(2))
    };
  });

  // 完全同分时，以答题组合确定轮转顺序，避免固定偏向名单中的第一位。
  const fingerprint = answers.reduce((hash, choice) => Math.imul(hash ^ (choice + 1), 16777619), 2166136261);
  const offset = (fingerprint >>> 0) % entries.length;
  const tieOrder = entry => (entry.order - offset + entries.length) % entries.length;
  entries.sort((a, b) =>
    b.points * a.maxPoints - a.points * b.maxPoints ||
    b.primary * a.maxPrimary - a.primary * b.maxPrimary ||
    b.breadth - a.breadth ||
    tieOrder(a) - tieOrder(b)
  );
  return { winner: entries[0].key, entries };
}
