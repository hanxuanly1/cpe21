// CSS 模块类型声明（供 web 端 starter 组件使用，消除 tsc 报错）
declare module '*.css';
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
