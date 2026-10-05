// Names and technologies come from the existing project page.
export const ROOM_PROJECTS=[
 {id:'project-chat',note:'note6',label:'C++ 聊天室',short:'聊天室',anchor:'cpp-chat-room',description:'多客户端实时通信，MySQL 保存用户信息。'},
 {id:'project-face',note:'note2',label:'人脸识别签到',short:'人脸识别',anchor:'face-recognition-api',description:'MTCNN 检测，FaceNet 识别，Flask 提供接口。'},
 {id:'project-compiler',note:'note0',label:'Pascal-S 编译器',short:'编译器',anchor:'pascal-s-compiler',description:'从源代码到执行：lex、yacc 与 LLVM。'},
];
export const roomProject=id=>ROOM_PROJECTS.find(project=>project.id===id);
