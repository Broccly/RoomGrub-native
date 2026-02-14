class NotificationService {
  async notify(..._args: any[]) {
    console.log('[MockNotification] notify called');
  }
  async notifyGroceryAdded(..._args: any[]) {
    console.log('[MockNotification] notifyGroceryAdded');
  }
  async notifyPaymentSettled(..._args: any[]) {
    console.log('[MockNotification] notifyPaymentSettled');
  }
  async notifyContributionMade(..._args: any[]) {
    console.log('[MockNotification] notifyContributionMade');
  }
  async notifyMemberJoined(..._args: any[]) {
    console.log('[MockNotification] notifyMemberJoined');
  }
}

export default new NotificationService();
