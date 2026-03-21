/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}"],

    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#14b8a6",
                    light: "#2dd4bf",
                    dark: "#0d9488",
                },
            },
        },
    },
    plugins: [],
};
