import React from 'react';
import {
  AppstoreOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  IdcardOutlined,
  MoneyCollectOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { QuickAction } from '../types/workplace';

export const workplaceQuickActions: QuickAction[] = [
  {
    key: 'styles',
    title: '款式',
    icon: React.createElement(AppstoreOutlined),
    color: '#52C41A',
  },
  {
    key: 'sample-orders',
    title: '样板单',
    icon: React.createElement(FileTextOutlined),
    color: '#722ED1',
  },
  {
    key: 'factory-orders',
    title: '工厂订单',
    icon: React.createElement(ShopOutlined),
    color: '#52C41A',
  },
  {
    key: 'customer-payment',
    title: '客户收款',
    icon: React.createElement(CreditCardOutlined),
    color: '#FA8C16',
  },
  {
    key: 'factory-payment',
    title: '加工厂付款',
    icon: React.createElement(MoneyCollectOutlined),
    color: '#1890FF',
  },
  {
    key: 'supplier-payment',
    title: '供应商付款',
    icon: React.createElement(ShoppingOutlined),
    color: '#F5222D',
  },
  {
    key: 'user-management',
    title: '用户管理',
    icon: React.createElement(UserOutlined),
    color: '#FA8C16',
  },
  {
    key: 'job-applications',
    title: '入职申请',
    icon: React.createElement(IdcardOutlined),
    color: '#13C2C2',
  },
];
