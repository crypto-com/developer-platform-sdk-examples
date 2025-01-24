import { Button, Dropdown } from 'antd';
import { useSSOStore } from './useSSOConnector';

interface ConncectedStatusProps {
  address: string
  onDisconnect: () => void
}

const ConncectedStatus = (props: ConncectedStatusProps) => {
  const {address} = props;
  const items = [
    {
      key: 'explorer',
      label: 'View in Explorer',
      onClick: () => window.open(`https://sepolia.explorer.zksync.io/address/${address}`, '_blank')
    },
    {
      key: 'dashboard',
      label: 'View sessions',
      onClick: () => window.open(`https://auth-test.zksync.dev/dashboard/sessions`, '_blank')
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
      onClick: props.onDisconnect
    }
  ];

  return (
      <Dropdown menu={{ items }} trigger={['hover']}>
        <Button type='primary' size='large' className='w-full' style={{ cursor: 'pointer' }}>{`${address.slice(0, 6)}...${address.slice(-4)}`}</Button>
      </Dropdown>
  );
};

export const SSOButton = () => {
  const { isConnected, connectAccount, disconnectAccount, address } = useSSOStore();

  return (
    <div
      onClick={() => {
        if (!isConnected) {
          connectAccount();
        }
      }}
    >
      {isConnected && address
        ? <ConncectedStatus address={address} onDisconnect={disconnectAccount} />
        : <Button>Connect with zkSync SSO</Button>}
    </div>
  );
};