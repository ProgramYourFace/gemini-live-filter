/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { memo, useEffect, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";


const declaration: FunctionDeclaration = {
  name: "duck_spotted",
  description: "Reports whether a duck was spotted in the image.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      spotted: {
        type: SchemaType.BOOLEAN,
        description:
          "Whether a duck was spotted in the image.",
      },
      where: {
        type: SchemaType.STRING,
        description:
          "Where the duck was spotted in the image.",
      },
    },
    required: ["spotted", "where"],
  },
};
function LiveFilterComponent() {
  const [spotted, setSpotted] = useState<boolean>(false);
  const [where, setWhere] = useState<string>('');
  const { client, setConfig, connected } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "text",
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful bird watching assistant. I am going to ask you if you see a duck. Please call the "duck_spotted" function with true or false depending on if you see a duck, and where in the image you see it. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [
        { functionDeclarations: [declaration] },
      ]
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const spotted = (fc.args as any).spotted
        setSpotted(spotted);
        const where = (fc.args as any).where
        setWhere(where);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        client.sendToolResponse({
          functionResponses: toolCall.functionCalls.map((fc) => ({
            response: { output: { success: true } },
            id: fc.id,
          })),
        });
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  useEffect(() => {
    if(!connected) return;
    async function query() {
      const response = await client.send([{
        text: "Do you see a duck?"
      }]);
      console.log(`response`, response);
    }
    const interval = setInterval(query, 2000);
    return () => clearInterval(interval);
  }, [client, connected])


  return <div className="vega-embed" >SPOTTED: {spotted + ''} WHERE: {where}</div>;
}

export const LiveFilter = memo(LiveFilterComponent);
