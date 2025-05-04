import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  MessageSquare, 
  RefreshCw, 
  Settings, 
  Users, 
  X 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function NotificationsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "task",
      title: "Task assigned to you",
      message: "API Documentation task has been assigned to you",
      time: "10 minutes ago",
      read: false,
      icon: <FileText className="h-5 w-5 text-blue-500" />
    },
    {
      id: 2,
      type: "comment",
      title: "New comment on task",
      message: "Sarah commented on 'Frontend Implementation'",
      time: "1 hour ago",
      read: false,
      icon: <MessageSquare className="h-5 w-5 text-green-500" />
    },
    {
      id: 3,
      type: "meeting",
      title: "Meeting reminder",
      message: "Sprint planning meeting in 30 minutes",
      time: "3 hours ago",
      read: true,
      icon: <Calendar className="h-5 w-5 text-purple-500" />
    },
    {
      id: 4,
      type: "system",
      title: "System update",
      message: "The system will be updated tonight at 2 AM",
      time: "5 hours ago",
      read: true,
      icon: <RefreshCw className="h-5 w-5 text-amber-500" />
    },
    {
      id: 5,
      type: "mention",
      title: "You were mentioned",
      message: "Alex mentioned you in a comment on 'Database Schema'",
      time: "Yesterday",
      read: true,
      icon: <Users className="h-5 w-5 text-indigo-500" />
    }
  ]);

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    browser: true,
    taskAssignments: true,
    comments: true,
    mentions: true,
    systemUpdates: false,
    meetings: true
  });

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleRemoveNotification = (id: number) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return notification.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Notifications" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Notifications</h1>
              <p className="text-neutral-500">Stay updated with your project activities</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCircle className="mr-1 h-4 w-4" />
                Mark all as read
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <X className="mr-1 h-4 w-4" />
                Clear all
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 sm:grid-cols-7 mb-4">
                  <TabsTrigger value="all">
                    All
                    {unreadCount > 0 && (
                      <Badge className="ml-1.5 bg-primary-50 text-primary-700 border-primary-200">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="task">Tasks</TabsTrigger>
                  <TabsTrigger value="comment">Comments</TabsTrigger>
                  <TabsTrigger value="mention">Mentions</TabsTrigger>
                  <TabsTrigger value="meeting">Meetings</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  {filteredNotifications.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 flex flex-col items-center justify-center text-center">
                        <Bell className="h-12 w-12 text-neutral-300 mb-4" />
                        <h3 className="text-lg font-medium text-neutral-700">No notifications</h3>
                        <p className="text-neutral-500 mt-1 max-w-md">
                          {activeTab === "all" 
                            ? "You don't have any notifications at the moment." 
                            : `You don't have any ${activeTab === "unread" ? "unread" : activeTab} notifications.`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredNotifications.map(notification => (
                      <Card key={notification.id} className={notification.read ? "bg-white" : "bg-primary-50"}>
                        <CardContent className="p-4">
                          <div className="flex">
                            <div className="flex-shrink-0 mt-1">
                              {notification.icon}
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className={`font-medium ${notification.read ? 'text-neutral-700' : 'text-primary-700'}`}>
                                  {notification.title}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-neutral-500">{notification.time}</span>
                                  {!notification.read && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6" 
                                      onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 text-primary-500" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => handleRemoveNotification(notification.id)}
                                  >
                                    <X className="h-4 w-4 text-neutral-500" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Notification Settings</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-700">Delivery Methods</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        </div>
                        <Label htmlFor="email-notifications" className="font-normal">
                          Email Notifications
                        </Label>
                      </div>
                      <Switch 
                        id="email-notifications" 
                        checked={notificationSettings.email}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, email: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-purple-500" />
                        </div>
                        <Label htmlFor="browser-notifications" className="font-normal">
                          Browser Notifications
                        </Label>
                      </div>
                      <Switch 
                        id="browser-notifications" 
                        checked={notificationSettings.browser}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, browser: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-700">Notification Types</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="task-assignments" className="font-normal">
                          Task Assignments
                        </Label>
                        <Switch 
                          id="task-assignments" 
                          checked={notificationSettings.taskAssignments}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, taskAssignments: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="comments" className="font-normal">
                          Comments
                        </Label>
                        <Switch 
                          id="comments" 
                          checked={notificationSettings.comments}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, comments: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mentions" className="font-normal">
                          Mentions
                        </Label>
                        <Switch 
                          id="mentions" 
                          checked={notificationSettings.mentions}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, mentions: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meetings" className="font-normal">
                          Meeting Reminders
                        </Label>
                        <Switch 
                          id="meetings" 
                          checked={notificationSettings.meetings}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, meetings: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="system-updates" className="font-normal">
                          System Updates
                        </Label>
                        <Switch 
                          id="system-updates" 
                          checked={notificationSettings.systemUpdates}
                          onCheckedChange={(checked) => 
                            setNotificationSettings(prev => ({ ...prev, systemUpdates: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                  <CardDescription>Your most recent project activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Frontend Implementation</p>
                      <p className="text-xs text-neutral-500">Updated 2 hours ago</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Comment on API Documentation</p>
                      <p className="text-xs text-neutral-500">1 day ago</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Team meeting</p>
                      <p className="text-xs text-neutral-500">2 days ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}