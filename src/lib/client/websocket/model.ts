/**
 * 这里是客户端通过 wsClient 发送给服务器信息的格式
 *
 */
export type TransiferData = {
	type: TxDataKey;
	payload: TxDataValue;
};

type TxDataKeyValue = {
	'ai-chat': TxDataAiChat;
};

export type TxDataKey = keyof TxDataKeyValue;
export type TxDataValue = TxDataKeyValue[keyof TxDataKeyValue];

export type TxDataAiChat = {
	type: TxDataAiChatKey;
	data: TxDataAiChatValue;
};

export type TxDataAiChatKeyValue = {
	'txt-imgs': TxDataAiChatTxtImgs;
	cancel: null;
	'tool-confirm-result': { approved: boolean };
};

export type TxDataAiChatKey = keyof TxDataAiChatKeyValue;
export type TxDataAiChatValue = TxDataAiChatKeyValue[keyof TxDataAiChatKeyValue];

export type TxDataAiChatTxtImgs = {
	txt: string;
	/**
	 * 图片连接
	 */
	imgs: string[];
};

// 这里是客户端接收服务器 WebSocket 信息的格式

export type RecevieData = {
	type: RxDataKey;
	payload: RxDataValue;
};

export type RxDataKey = keyof RxDataKeyValue;
type RxDataValue = RxDataKeyValue[keyof RxDataKeyValue];

export type RxDataKeyValue = {
	'ai-chat': RxDataAiChat;
};

export type RxDataAiChat = {
	type: RxDataAiChatKey;
	data: RxDataAiChatValue;
};

type RxDataAiChatKey = keyof RxDataAiChatKeyValue;
type RxDataAiChatValue = RxDataAiChatKeyValue[keyof RxDataAiChatKeyValue];

export type RxDataAiChatKeyValue = {
	/**
	 * AI 返回的纯文本信息
	 */
	'plain-chunk': string;
	'thinking-chunk': string;
	'tool-call-start': { name: string; args: string };
	'tool-call-end': { result: string };
	'tool-call-confirm': { name: string; args: string };
	/**
	 * 取消当前会话
	 */
	cancel: string;
	/**
	 * 客户端发送了服务端无法识别的内容
	 */
	unknow: string;
	/**
	 * 表示 AI 处理完了
	 */
	end: null;
};
