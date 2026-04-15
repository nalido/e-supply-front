import { Select, Tag } from 'antd';
import type { SizeType } from 'antd/es/config-provider/SizeContext';
import type { SaleChannelAccount } from '../../types/sale';
import { getCompactSaleSellerTypeLabel, getSaleChannelAccountDisplayName } from './sale-channel-account-helper';

type SaleChannelAccountSelectProps = {
  accounts: SaleChannelAccount[];
  value?: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  width?: number;
  size?: SizeType;
};

const SaleChannelAccountSelect = ({
  accounts,
  value,
  onChange,
  allowAll = false,
  allLabel = '全部店铺',
  placeholder = '选择店铺',
  width = 320,
  size = 'middle',
}: SaleChannelAccountSelectProps) => {
  const renderOptionLabel = (account: SaleChannelAccount) => {
    const displayName = getSaleChannelAccountDisplayName(account);
    const sellerTypeLabel = account.sellerType ? getCompactSaleSellerTypeLabel(account.sellerType) : '';
    const sellerTypeColor =
      account.sellerType === 'FULLY_MANAGED' ? 'blue' : account.sellerType === 'SEMI_MANAGED' ? 'green' : 'default';

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        {sellerTypeLabel ? (
          <Tag
            color={sellerTypeColor}
            style={{
              marginInlineEnd: 0,
              flexShrink: 0,
              paddingInline: 6,
              lineHeight: '18px',
              fontSize: 12,
            }}
          >
            {sellerTypeLabel}
          </Tag>
        ) : null}
      </div>
    );
  };

  const options = [
    ...(allowAll ? [{ label: allLabel, value: '', searchText: allLabel.toLowerCase() }] : []),
    ...accounts.map((item) => {
      const displayName = getSaleChannelAccountDisplayName(item);
      return {
        label: renderOptionLabel(item),
        value: item.id,
        searchText: `${displayName} ${item.id} ${item.shopId ?? ''} ${item.shopName ?? ''} ${item.sellerType ?? ''}`.toLowerCase(),
      };
    }),
  ];

  return (
    <Select
      style={{ width }}
      size={size}
      placeholder={placeholder}
      value={value}
      options={options}
      onChange={onChange}
      showSearch
      filterOption={(input, option) => (option?.searchText as string | undefined)?.includes(input.toLowerCase()) ?? false}
    />
  );
};

export default SaleChannelAccountSelect;
