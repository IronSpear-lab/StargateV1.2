import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  Phone, 
  Search,
  Video,
  CheckCircle, 
  Users, 
  Settings
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("getting-started");
  
  const categories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <BookOpen className="h-5 w-5" />,
      articles: [
        {
          id: "gs-1",
          title: "Creating your first project",
          excerpt: "Learn how to create and set up your first project in ValvXl."
        },
        {
          id: "gs-2",
          title: "Inviting team members",
          excerpt: "Add collaborators to your project and manage their permissions."
        },
        {
          id: "gs-3",
          title: "Navigating the dashboard",
          excerpt: "Understand the dashboard layout and available features."
        },
        {
          id: "gs-4",
          title: "Setting up project preferences",
          excerpt: "Configure your project settings for optimal workflow."
        }
      ]
    },
    {
      id: "tasks-management",
      title: "Task Management",
      icon: <CheckCircle className="h-5 w-5" />,
      articles: [
        {
          id: "tm-1",
          title: "Creating and assigning tasks",
          excerpt: "Learn how to create, assign, and track tasks in your projects."
        },
        {
          id: "tm-2",
          title: "Using the Kanban board",
          excerpt: "Organize your workflow with customizable Kanban boards."
        },
        {
          id: "tm-3",
          title: "Working with the Gantt chart",
          excerpt: "Plan and visualize project timelines with Gantt charts."
        }
      ]
    },
    {
      id: "file-management",
      title: "File Management",
      icon: <FileText className="h-5 w-5" />,
      articles: [
        {
          id: "fm-1",
          title: "Uploading files and documents",
          excerpt: "Upload, organize, and share files within your projects."
        },
        {
          id: "fm-2",
          title: "Managing file permissions",
          excerpt: "Control who can view, edit, and download your project files."
        },
        {
          id: "fm-3",
          title: "Using the PDF viewer",
          excerpt: "View, annotate, and collaborate on PDF documents."
        }
      ]
    },
    {
      id: "collaboration",
      title: "Collaboration",
      icon: <Users className="h-5 w-5" />,
      articles: [
        {
          id: "collab-1",
          title: "Team communication",
          excerpt: "Effective communication tools and features for your team."
        },
        {
          id: "collab-2",
          title: "Using comments and mentions",
          excerpt: "Collaborate on tasks and documents with comments and @mentions."
        },
        {
          id: "collab-3",
          title: "Activity tracking and notifications",
          excerpt: "Stay updated with project activities and important notifications."
        }
      ]
    },
    {
      id: "account-settings",
      title: "Account & Settings",
      icon: <Settings className="h-5 w-5" />,
      articles: [
        {
          id: "settings-1",
          title: "Managing your account",
          excerpt: "Update your profile, password, and account preferences."
        },
        {
          id: "settings-2",
          title: "Security and authentication",
          excerpt: "Set up two-factor authentication and manage security settings."
        },
        {
          id: "settings-3",
          title: "Billing and subscriptions",
          excerpt: "Manage your subscription plan, payment methods, and billing history."
        }
      ]
    }
  ];
  
  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "You can reset your password by clicking the 'Forgot Password' link on the login page. You'll receive an email with instructions to create a new password. If you don't receive the email, check your spam folder or contact support."
    },
    {
      question: "Can I transfer files between projects?",
      answer: "Yes, you can transfer files between projects. Select the file you want to move, click the menu options (three dots), and choose 'Move to'. From there, you can select the destination project and folder."
    },
    {
      question: "How do I change project permissions for a team member?",
      answer: "To change a team member's project permissions, go to the project settings, select the 'Team' tab, find the team member in the list, and click on their current role. A dropdown will appear where you can select a new permission level."
    },
    {
      question: "Is there a limit to the number of projects I can create?",
      answer: "The number of projects you can create depends on your subscription plan. Free accounts can create up to 3 projects, while paid plans offer increased or unlimited project creation. You can view your current limits in your account settings."
    },
    {
      question: "How do I export data from my project?",
      answer: "To export project data, go to the project settings and select the 'Export' option. You can choose to export tasks, files, or the entire project in various formats including CSV, Excel, or PDF. The export will be prepared and made available for download."
    },
    {
      question: "Can I customize notification settings?",
      answer: "Yes, you can customize your notification settings. Go to your account settings, select the 'Notifications' tab, and choose which events you want to be notified about and through which channels (email, browser, or in-app)."
    }
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };
  
  // Filter articles based on search query
  const filteredArticles = searchQuery.trim() === "" 
    ? [] 
    : categories.flatMap(category => 
        category.articles.filter(article => 
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(article => ({
          ...article,
          category: category.title
        }))
      );

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Help Center</h1>
          <p className="text-neutral-500">Find answers, learn how to use ValvXl, and get support</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button variant="outline">
            <Video className="mr-2 h-4 w-4" />
            Video Tutorials
          </Button>
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>
      </div>

      <div className="bg-primary-50 rounded-xl p-8 mb-8">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h2 className="text-2xl font-medium text-primary-900 mb-2">How can we help you today?</h2>
          <p className="text-primary-700">Search our knowledge base or browse categories below</p>
        </div>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
          <Input 
            placeholder="Search for help, articles, and tutorials..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
          {searchQuery.trim() !== "" && (
            <div className="absolute inset-x-0 top-full mt-2 bg-white rounded-md shadow-lg border border-neutral-200 max-h-96 overflow-y-auto z-10">
              {filteredArticles.length === 0 ? (
                <div className="p-4 text-center">
                  <HelpCircle className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
                  <p className="text-neutral-600">No results found for "{searchQuery}"</p>
                  <p className="text-neutral-500 text-sm mt-1">Try different keywords or browse the categories below</p>
                </div>
              ) : (
                <div>
                  {filteredArticles.map(article => (
                    <div key={article.id} className="p-3 hover:bg-neutral-50 border-b border-neutral-200 last:border-0">
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-neutral-900 truncate">{article.title}</h4>
                          <p className="text-xs text-neutral-500 mt-0.5 truncate">{article.excerpt}</p>
                          <div className="text-xs text-primary-600 mt-1">In: {article.category}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 flex-shrink-0 ml-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="articles" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="articles">Help Articles</TabsTrigger>
          <TabsTrigger value="faq">FAQs</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
        </TabsList>
        
        <TabsContent value="articles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(category => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                      {category.icon}
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="space-y-3">
                    {category.articles.slice(0, 3).map(article => (
                      <li key={article.id}>
                        <a 
                          href="#" 
                          className="text-sm text-neutral-700 hover:text-primary-600 hover:underline flex items-center"
                        >
                          <ChevronRight className="h-3 w-3 mr-1 text-neutral-400" />
                          {article.title}
                        </a>
                      </li>
                    ))}
                    {category.articles.length > 3 && (
                      <li>
                        <a href="#" className="text-xs font-medium text-primary-600 hover:underline">
                          View all articles ({category.articles.length})
                        </a>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-medium text-neutral-900 mb-4">Browse All Documentation</h2>
            
            <div className="space-y-4">
              {categories.map(category => (
                <Card key={category.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-900">{category.title}</h3>
                        <p className="text-sm text-neutral-500">{category.articles.length} articles</p>
                      </div>
                    </div>
                    {expandedCategory === category.id ? (
                      <ChevronDown className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                  
                  {expandedCategory === category.id && (
                    <div className="border-t border-neutral-200">
                      <ul className="divide-y divide-neutral-200">
                        {category.articles.map(article => (
                          <li key={article.id}>
                            <a 
                              href="#" 
                              className="block p-4 hover:bg-neutral-50"
                            >
                              <h4 className="font-medium text-neutral-900">{article.title}</h4>
                              <p className="text-sm text-neutral-500 mt-1">{article.excerpt}</p>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Common questions about using ValvXl</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium text-neutral-900 mb-2">Didn't find what you're looking for?</h3>
                <p className="text-neutral-600 text-sm mb-4">Our support team is here to help with any questions you may have.</p>
                <Button>Contact Support</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle>Chat Support</CardTitle>
                <CardDescription>Chat with our support team in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 mb-4">Available Monday to Friday, 9 AM - 6 PM EST</p>
                <Button className="w-full">Start Chat</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle>Email Support</CardTitle>
                <CardDescription>Send us an email and we'll get back to you</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 mb-4">Typical response time: 24-48 hours</p>
                <Button variant="outline" className="w-full">
                  support@valvxl.com
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Phone className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle>Phone Support</CardTitle>
                <CardDescription>Speak directly with a support agent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 mb-4">Available for Enterprise customers</p>
                <Button variant="outline" className="w-full">
                  +1 (555) 123-4567
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>Fill out the form below and we'll get back to you</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input placeholder="your.email@example.com" type="email" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input placeholder="What's your message about?" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea 
                    className="min-h-[120px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    placeholder="How can we help you?"
                  />
                </div>
                
                <div className="pt-4">
                  <Button type="submit">Send Message</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}