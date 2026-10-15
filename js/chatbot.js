class ChatBot {
    constructor() {
        this.reset();
    }

    reset() {
        this.started = false;
        this.name = '';
        this.numbers = null;
        this.ans = null;
        this.variables = Object.create(null);
        this.history = [];
    }

    snapshot() {
        return {
            started: this.started,
            name: this.name,
            numbers: this.numbers === null ? null : [...this.numbers],
            ans: this.ans,
            variables: {...this.variables}
        };
    }

    restore(state) {
        this.started = state.started;
        this.name = state.name;
        this.numbers = state.numbers === null ? null : [...state.numbers];
        this.ans = state.ans;
        this.variables = Object.assign(Object.create(null), state.variables);
    }

    undo() {
        if (this.history.length === 0) {
            return false;
        }
        this.restore(this.history.pop());
        return true;
    }

    respond(message) {
        const text = message.trim();
        const previous = this.snapshot();
        const answer = this.process(text);
        this.history.push(previous);
        return answer;
    }

    process(text) {
        if (/^\/start$/i.test(text)) {
            this.started = true;
            this.name = '';
            this.numbers = null;
            this.ans = null;
            this.variables = Object.create(null);
            return 'Привет, меня зовут Чат-бот, а как зовут тебя?';
        }

        if (/^\/stop$/i.test(text)) {
            this.started = false;
            this.name = '';
            this.numbers = null;
            this.ans = null;
            this.variables = Object.create(null);
            return 'Всего доброго, если хочешь поговорить пиши /start';
        }

        if (!this.started) {
            return 'Введите команду /start, для начала общения';
        }

        const nameMatch = text.match(/^\/name\s*:\s*(.*)$/i);
        if (nameMatch) {
            const name = nameMatch[1].trim();
            if (!name) {
                return 'Укажите имя после команды /name:';
            }
            this.name = name;
            return `Привет ${name}, приятно познакомиться. Я умею считать, введи числа которые надо посчитать`;
        }

        const setMatch = text.match(/^\/set\s*:\s*(.*)$/i);
        if (setMatch) {
            const definition = setMatch[1].match(/^([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(\S+)$/);
            if (!definition || definition[1].toLowerCase() === 'ans') {
                return 'Неверный формат ввода';
            }
            const name = definition[1];
            const value = this.resolveValue(definition[2]);
            if (value === null) {
                return 'Вводите только целые числа';
            }
            this.variables[name] = value;
            return `Переменная ${name} = ${this.format(value)} сохранена`;
        }

        const numberMatch = text.match(/^\/numbers\s*:\s*(.*)$/i);
        if (numberMatch) {
            const result = this.parseNumbers(numberMatch[1]);
            if (result.error) {
                return result.error;
            }
            this.numbers = result.values;
            return 'Числа приняты. Введи действие: +, -, *, /, gcd, avg, min, max';
        }

        if (['+', '-', '*', '/', 'gcd', 'avg', 'min', 'max'].includes(text.toLowerCase())) {
            if (this.numbers === null) {
                return 'Сначала введи числа через команду /numbers:';
            }
            const result = this.calculate(text.toLowerCase(), this.numbers);
            if (result.error) {
                return result.error;
            }
            this.ans = result.value;
            return `Результат: ${this.format(result.value, text.toLowerCase() === 'avg' ? 2 : 4)}`;
        }

        return 'Я не понимаю, введите другую команду!';
    }

    resolveValue(token) {
        if (/^[+-]?\d+$/.test(token)) {
            const number = Number(token);
            return Number.isSafeInteger(number) ? number : null;
        }
        if (token === 'ans') {
            return this.ans;
        }
        if (Object.hasOwn(this.variables, token)) {
            return this.variables[token];
        }
        return null;
    }

    parseNumbers(text) {
        const value = text.trim();
        if (!value) {
            return {error: 'Вводите только целые числа'};
        }
        const tokens = value.split(/[,;\s]+/).filter(Boolean);
        const values = [];
        for (const token of tokens) {
            const range = token.match(/^([+-]?\d+)\.{2,3}([+-]?\d+)$/);
            if (range) {
                const start = Number(range[1]);
                const end = Number(range[2]);
                if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end - start >= 10000 || values.length + end - start + 1 > 10000) {
                    return {error: 'Неверный формат ввода'};
                }
                for (let number = start; number <= end; number++) {
                    values.push(number);
                }
                continue;
            }
            if (token.includes('..')) {
                return {error: 'Неверный формат ввода'};
            }
            const number = this.resolveValue(token);
            if (number === null) {
                return {error: 'Вводите только целые числа'};
            }
            values.push(number);
            if (values.length > 10000) {
                return {error: 'Неверный формат ввода'};
            }
        }
        if (values.length === 0) {
            return {error: 'Вводите только целые числа'};
        }
        return {values};
    }

    calculate(action, numbers) {
        let value;
        switch (action) {
            case '+':
                value = numbers.reduce((sum, number) => sum + number, 0);
                break;
            case '-':
                value = numbers.slice(1).reduce((result, number) => result - number, numbers[0]);
                break;
            case '*':
                value = numbers.reduce((product, number) => product * number, 1);
                break;
            case '/':
                if (numbers.slice(1).some(number => number === 0)) {
                    return {error: 'Ошибка: деление на ноль'};
                }
                value = numbers.slice(1).reduce((result, number) => result / number, numbers[0]);
                break;
            case 'min':
                value = numbers.reduce((min, number) => Math.min(min, number));
                break;
            case 'max':
                value = numbers.reduce((max, number) => Math.max(max, number));
                break;
            case 'avg':
                value = numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
                break;
            case 'gcd':
                if (!numbers.every(Number.isSafeInteger)) {
                    return {error: 'Вводите только целые числа'};
                }
                value = numbers.reduce((result, number) => {
                    let a = Math.abs(result);
                    let b = Math.abs(number);
                    while (b !== 0) {
                        [a, b] = [b, a % b];
                    }
                    return a;
                }, 0);
                break;
        }
        if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
            return {error: 'Результат слишком большой'};
        }
        return {value};
    }

    format(value, precision = 4) {
        if (Number.isInteger(value)) {
            return String(value);
        }
        return String(Number(value.toFixed(precision)));
    }
}

window.ChatBot = ChatBot;
