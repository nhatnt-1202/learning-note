import DefaultTheme from "vitepress/theme";
import CodePlayground from "./components/CodePlayground.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({app}) {
    app.component("CodePlayground", CodePlayground);
  }
};
