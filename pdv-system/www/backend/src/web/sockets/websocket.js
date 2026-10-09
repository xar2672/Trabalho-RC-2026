import crypto from "crypto";

const MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function generateAcceptKey(clientKey) {
    return crypto
        .createHash("sha1")
        .update(clientKey + MAGIC_STRING)
        .digest("base64");
}

export function parseFrame(buffer) {
    // Need at least 2 bytes to read the header
    if (buffer.length < 2) return null;

    const firstByte = buffer[0];
    const secondByte = buffer[1];

    const isFinal = Boolean(firstByte & 0x80);
    const opcode = firstByte & 0x0f;
    const isMasked = Boolean(secondByte & 0x80);
    
    let payloadLength = secondByte & 0x7f;
    let offset = 2;

    // Decode extended payload lengths
    if (payloadLength === 126) {
        if (buffer.length < 4) return null; // Wait for full length bytes
        payloadLength = buffer.readUInt16BE(2);
        offset += 2;
    } else if (payloadLength === 127) {
        if (buffer.length < 10) return null; // Wait for full length bytes
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset += 8;
    }

    const maskSize = isMasked ? 4 : 0;
    const totalFrameLength = offset + maskSize + payloadLength;

    // Wait until the entire frame has arrived in the TCP chunk
    if (buffer.length < totalFrameLength) {
        return null; 
    }

    let maskKey = null;
    if (isMasked) {
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
    }

    // Extract and unmask payload
    const rawPayload = buffer.subarray(offset, offset + payloadLength);
    const unmaskedData = Buffer.alloc(payloadLength);

    if (isMasked) {
        for (let i = 0; i < payloadLength; i++) {
            unmaskedData[i] = rawPayload[i] ^ maskKey[i % 4];
        }
    } else {
        rawPayload.copy(unmaskedData);
    }

    // Determine frame type based on opcode
    let type = "unknown";
    if (opcode === 1) type = "text";
    else if (opcode === 2) type = "binary";
    else if (opcode === 8) type = "close";
    else if (opcode === 9) type = "ping";
    else if (opcode === 10) type = "pong";

    return {
        type,
        isFinal,
        data: type === "text" ? unmaskedData.toString("utf8") : unmaskedData,
        consumed: totalFrameLength
    };
}

export function createFrame(message) {
    // Convert message to buffer if it isn't already
    const payload = Buffer.isBuffer(message) ? message : Buffer.from(String(message), "utf8");
    const length = payload.length;

    let headerSize = 2;
    if (length > 65535) headerSize = 10;
    else if (length > 125) headerSize = 4;

    const frame = Buffer.alloc(headerSize + length);

    // FIN bit set (0x80) OR Opcode (0x01 for Text)
    frame[0] = 0x81; 

    // Encode length
    if (length <= 125) {
        frame[1] = length;
    } else if (length <= 65535) {
        frame[1] = 126;
        frame.writeUInt16BE(length, 2);
    } else {
        frame[1] = 127;
        frame.writeBigUInt64BE(BigInt(length), 2);
    }

    // Server-to-Client frames are NOT masked, just copy the payload
    payload.copy(frame, headerSize);
    return frame;
}