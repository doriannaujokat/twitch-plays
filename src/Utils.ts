declare global {
    interface ObjectConstructor {
        deepMerge: <T extends Object>(target: T, ...sources: Object[]) => T;
        isObject: (item: any) => boolean;
    }
}
Object.isObject = function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
Object.deepMerge = function deepMerge(target: Object, ...sources: Object[]) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (Object.isObject(target) && Object.isObject(source)) {
        for (const key in source) {
            if (Object.isObject(source[key])) {
                if (!target[key]) target[key] = {};
                Object.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    return deepMerge(target, ...sources);
}

export {};
