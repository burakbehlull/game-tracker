import { useState, useEffect } from 'react';
import { Bell, Trash2, Check, MessageSquare, Users2, Shield, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageSquare className="w-5 h-5" />;
      case 'MEMBER_ACCEPTED':
      case 'MEMBER_REQUEST':
        return <Users2 className="w-5 h-5" />;
      case 'ROLE_UPDATED':
      case 'DISCUSSION_APPROVED':
        return <Shield className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationText = (n) => {
    switch (n.type) {
      case 'DISCUSSION_APPROVED':
        return `Tartışman "${n.data.title}" onaylandı!`;
      case 'MEMBER_ACCEPTED':
        return `"${n.data.communityName}" topluluğuna kabul edildin!`;
      case 'NEW_POST':
        return `"${n.data.communityName}" topluluğunda yeni bir konu: ${n.data.title}`;
      case 'MEMBER_REQUEST':
        return `"${n.data.communityName}" topluluğuna yeni üyelik isteği var.`;
      case 'ROLE_UPDATED':
        return `"${n.data.communityName}" topluluğunda rolün ${n.data.roleName || n.data.role} olarak güncellendi.`;
      case 'NEW_MESSAGE':
        return `${n.data.senderName} size mesaj attı: ${n.data.messagePreview}`;
      default:
        return 'Yeni bir bildiriminiz var.';
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            BİLDİRİMLER
          </h1>
          <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">
            SON AKTİVİTELERİNİZ
          </p>
        </div>
        
        {notifications.some(n => !n.read) && (
          <Button 
            onClick={handleMarkAllRead}
            variant="ghost"
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
          >
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Yükleniyor...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto">
              <Bell className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest italic opacity-40">Henüz bildiriminiz yok</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n._id}
              className={cn(
                "group relative bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 transition-all duration-300 hover:bg-white/5",
                !n.read && "border-primary/20 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110",
                  !n.read ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"
                )}>
                  {getNotificationIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      !n.read ? "text-primary" : "text-muted-foreground"
                    )}>
                      {n.type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="w-8 h-8 rounded-xl hover:bg-green-500/20 hover:text-green-500"
                          onClick={() => handleMarkRead(n._id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="w-8 h-8 rounded-xl hover:bg-red-500/20 hover:text-red-500"
                        onClick={() => handleDeleteNotification(n._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-lg font-bold transition-colors",
                    !n.read ? "text-white" : "text-muted-foreground"
                  )}>
                    {getNotificationText(n)}
                  </p>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {new Date(n.createdAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
              
              {!n.read && (
                <div className="absolute top-6 right-6 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
