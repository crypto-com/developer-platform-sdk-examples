import { useSSOStore } from '../useSSOStore';
import type { SessionData } from '../useSSOStore';
import { Button, Card, Typography, Tag } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { LimitType, SessionState, SessionStatus, type Limit, type TransferPolicy } from 'zksync-sso/utils';
import { getTXExplorerLink } from '../utils';

const { Text, Link } = Typography;

const formatLimit = (limit: Limit): string => {
    try {
        if (limit.limitType === LimitType.Unlimited) {
            return 'Unlimited';
        }
        return `${limit.limit.toString()} Wei`;
    } catch {
        return '0';
    }
};

const isExpired = (expiresAt: bigint): boolean => {
    return expiresAt < BigInt(Math.floor(Date.now() / 1000));
};

const SessionRow = ({ session }: { session: SessionData }) => {
    const [sessionState, setSessionState] = useState<SessionState | null>(null);
    const { fetchSessionState } = useSSOStore();

    useEffect(() => {
        fetchSessionState(session).then(setSessionState);
    }, [session, fetchSessionState]);

    const getStatus = () => {
        if (sessionState?.status === SessionStatus.Closed) return { color: 'default', text: 'Revoked' };
        if (isExpired(session.session.expiresAt)) return { color: 'error', text: 'Expired' };
        if (sessionState?.status === SessionStatus.Active) return { color: 'success', text: 'Active' };
        return { color: 'default', text: 'Unknown' };
    };

    return (
        <Card
            key={session.sessionId}
            className="w-full"
            size="small"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Text>ID: </Text>
                        <Link href={getTXExplorerLink(session.transactionHash)} target="_blank">
                            {session.sessionId.slice(0, 4)}...{session.sessionId.slice(-4)}
                            <ExportOutlined className="ml-1 text-xs" />
                        </Link>
                        <Tag color={getStatus().color}>
                            {getStatus().text}
                        </Tag>
                    </div>
                    <div className="mt-1 text-gray-500 text-sm">
                        <div>Created: {new Date(session.timestamp).toLocaleString()}</div>
                        <div>Expires: {new Date(Number(session.session.expiresAt) * 1000).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div>
                <Text strong>Policies</Text>
                <div className="mt-3">
                    <div className="mb-3">
                        <Text type="secondary">Fee Limit</Text>
                        <div className="font-mono text-sm">
                            {formatLimit(session.session.feeLimit)}
                        </div>
                    </div>
                    {session.session.transferPolicies.map((policy: TransferPolicy, idx: number) => (
                        <div key={idx} className="mb-3">
                            <Tag color="blue">Transfer Policy {idx + 1}</Tag>
                            <div className="mt-2">
                                <Text type="secondary">Target Address</Text>
                                <div className="font-mono text-sm break-all">
                                    {policy.target}
                                </div>
                                <Text type="secondary" className="mt-2 block">Value Limit</Text>
                                <div className="font-mono text-sm">
                                    {formatLimit(policy.valueLimit)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export const Session = () => {
    const { sessions, fetchAllSessions } = useSSOStore();

    useEffect(() => {
        fetchAllSessions();
    }, [fetchAllSessions]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white">
                <div className="flex justify-between items-center">
                    <Text strong className="text-lg">Sessions</Text>
                    <Button
                        size="small"
                        onClick={fetchAllSessions}
                    >
                        Refresh
                    </Button>
                </div>
            </div>
            <div className="flex flex-col gap-4">
                {sessions.map((session) => (
                    <SessionRow key={session.sessionId} session={session} />
                ))}
            </div>
        </div>
    );
};