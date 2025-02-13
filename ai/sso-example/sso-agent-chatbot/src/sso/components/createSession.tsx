import { useState } from 'react';
import { Button, Form, Input, Card, Typography, message } from 'antd';
import { useSSOStore } from '../useSSOStore';
import { Address } from 'viem';
import { LimitType, SessionConfig } from 'zksync-sso/utils';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';

const { Text } = Typography;

export type ConvertBigIntToString<T> = T extends bigint
  ? string
  : T extends Array<infer U>
    ? Array<ConvertBigIntToString<U>>
    : T extends object
      ? { [K in keyof T]: ConvertBigIntToString<T[K]> }
      : T;


export type SessionConfigJSON = ConvertBigIntToString<SessionConfig>;

interface CreateSessionForm {
    feeLimit: string;
    transferRecipient: string;
    valueLimit: string;
}

export const CreateSession = () => {
    const [form] = Form.useForm<CreateSessionForm>();
    const [loading, setLoading] = useState(false);
    const { fetchAllSessions, createSession  } = useSSOStore();

    const handleSubmit = async (values: CreateSessionForm) => {

        setLoading(true);
        try {

            const sessionKey = generatePrivateKey();
            const sessionPublicKey = privateKeyToAddress(sessionKey);

            const target = values.transferRecipient as Address;
            const maxValuePerUse = BigInt(values.valueLimit);
            const feeLimit = BigInt(values.feeLimit);

            const session: SessionConfig = {
                signer: sessionPublicKey,
                expiresAt: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 24 hours
                feeLimit: {
                    limitType: LimitType.Lifetime,
                    limit: feeLimit,
                    period: 0n,
                },
                transferPolicies: [
                  {
                    target: target,
                    maxValuePerUse: maxValuePerUse,
                    valueLimit: {
                      limitType: LimitType.Lifetime,
                      limit: maxValuePerUse,
                      period: 0n,
                    },
                  }
                ],
                callPolicies: [],
            }

            await createSession(session);

            localStorage.setItem('chatbot.sessionKey', sessionKey);
            message.success('Session created successfully');
            form.resetFields();
            fetchAllSessions();

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title={<Text strong>Create New Session</Text>} className="w-full">
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    feeLimit: '1000000000000000000',
                    transferRecipient: '0x0000000000000000000000000000000000000000',
                    valueLimit: '1'
                }}
            >
                <Form.Item
                    name="feeLimit"
                    label="Fee Limit (Wei)"
                    rules={[{ required: true, message: 'Please input fee limit' }]}
                >
                    <Input placeholder="e.g. 1000000000000000" />
                </Form.Item>

                <Form.Item
                    name="transferRecipient"
                    label="Transfer Recipient Address"
                    rules={[
                        { required: true, message: 'Please input recipient address' },
                        { pattern: /^0x[a-fA-F0-9]{40}$/, message: 'Invalid Ethereum address' }
                    ]}
                >
                    <Input placeholder="0x..." />
                </Form.Item>

                <Form.Item
                    name="valueLimit"
                    label="Value Limit (Wei)"
                    rules={[{ required: true, message: 'Please input value limit' }]}
                >
                    <Input placeholder="e.g. 1000000000000000" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        Create Session
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};
