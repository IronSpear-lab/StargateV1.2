import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { 
  Briefcase, 
  Mail, 
  MoreHorizontal, 
  Phone, 
  Plus, 
  Search, 
  User, 
  Users 
} from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "active" | "offline" | "busy";
  avatarUrl?: string;
}

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  
  const departments = [
    "Engineering",
    "Design",
    "Product",
    "Marketing",
    "Sales",
    "Support"
  ];
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "offline":
        return "bg-neutral-300";
      default:
        return "bg-neutral-300";
    }
  };
  
  const getColorByDepartment = (department: string) => {
    switch (department) {
      case "Engineering":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Design":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Product":
        return "bg-green-50 text-green-700 border-green-200";
      case "Marketing":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "Sales":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Support":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  };
  
  const team: TeamMember[] = [
    {
      id: 1,
      name: "Alex Morgan",
      role: "Frontend Developer",
      department: "Engineering",
      email: "alex.morgan@example.com",
      phone: "+1 (555) 123-4567",
      status: "active"
    },
    {
      id: 2,
      name: "Jamie Chen",
      role: "UI/UX Designer",
      department: "Design",
      email: "jamie.chen@example.com",
      phone: "+1 (555) 765-4321",
      status: "active"
    },
    {
      id: 3,
      name: "Taylor Kim",
      role: "Product Manager",
      department: "Product",
      email: "taylor.kim@example.com",
      phone: "+1 (555) 987-6543",
      status: "busy"
    },
    {
      id: 4,
      name: "Jordan Smith",
      role: "Backend Developer",
      department: "Engineering",
      email: "jordan.smith@example.com",
      phone: "+1 (555) 456-7890",
      status: "offline"
    },
    {
      id: 5,
      name: "Casey Johnson",
      role: "Marketing Lead",
      department: "Marketing",
      email: "casey.johnson@example.com",
      phone: "+1 (555) 234-5678",
      status: "active"
    },
    {
      id: 6,
      name: "Riley Brown",
      role: "Sales Representative",
      department: "Sales",
      email: "riley.brown@example.com",
      phone: "+1 (555) 876-5432",
      status: "busy"
    },
    {
      id: 7,
      name: "Quinn Wilson",
      role: "Support Specialist",
      department: "Support",
      email: "quinn.wilson@example.com",
      phone: "+1 (555) 345-6789",
      status: "active"
    },
    {
      id: 8,
      name: "Avery Martinez",
      role: "DevOps Engineer",
      department: "Engineering",
      email: "avery.martinez@example.com",
      phone: "+1 (555) 654-3210",
      status: "offline"
    }
  ];
  
  const filteredTeam = team.filter(member => {
    const matchesSearch = searchQuery === "" || 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || 
      member.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Team" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Team</h1>
              <p className="text-neutral-500">Manage your team members and their access</p>
            </div>
            <div className="flex space-x-2 mt-4 md:mt-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Add a new team member to your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Enter full name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="email@example.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Input id="role" placeholder="e.g. Developer" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="department">Department</Label>
                        <Select>
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                            <SelectItem value="new">+ Add New Department</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Add Member</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                    <Input 
                      placeholder="Search by name, role, or email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="w-full md:w-64">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="grid">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <div className="text-sm text-neutral-500">
                Showing {filteredTeam.length} of {team.length} members
              </div>
            </div>
            
            <TabsContent value="grid" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeam.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                    <Users className="h-12 w-12 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-700">No team members found</h3>
                    <p className="text-neutral-500 mt-1">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  filteredTeam.map(member => (
                    <Card key={member.id} className="overflow-hidden">
                      <CardHeader className="p-0">
                        <div className="h-24 bg-gradient-to-r from-primary-600 to-primary-400"></div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <div className="flex justify-between -mt-10 mb-4">
                          <Avatar className="h-20 w-20 border-4 border-white">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback className="text-lg bg-primary-100 text-primary-700">{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="pt-10">
                            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(member.status)}`}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg text-neutral-900">{member.name}</h3>
                              <p className="text-neutral-500">{member.role}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <User className="mr-2 h-4 w-4" />
                                  <span>View Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="mr-2 h-4 w-4" />
                                  <span>Send Email</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  <span>Assign to Project</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={`mt-2 ${getColorByDepartment(member.department)}`}
                          >
                            {member.department}
                          </Badge>
                          
                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 text-neutral-500 mr-2" />
                              <span className="text-neutral-700">{member.email}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-neutral-500 mr-2" />
                              <span className="text-neutral-700">{member.phone}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              <Card>
                <CardContent className="p-0">
                  {filteredTeam.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <Users className="h-12 w-12 text-neutral-300 mb-4" />
                      <h3 className="text-lg font-medium text-neutral-700">No team members found</h3>
                      <p className="text-neutral-500 mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium text-sm text-neutral-500">Name</th>
                            <th className="text-left p-4 font-medium text-sm text-neutral-500">Role</th>
                            <th className="text-left p-4 font-medium text-sm text-neutral-500">Department</th>
                            <th className="text-left p-4 font-medium text-sm text-neutral-500">Email</th>
                            <th className="text-left p-4 font-medium text-sm text-neutral-500">Status</th>
                            <th className="text-right p-4 font-medium text-sm text-neutral-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeam.map(member => (
                            <tr key={member.id} className="border-b hover:bg-neutral-50">
                              <td className="p-4">
                                <div className="flex items-center">
                                  <Avatar className="h-8 w-8 mr-3">
                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                    <AvatarFallback className="text-xs bg-primary-100 text-primary-700">{getInitials(member.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{member.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-neutral-700">{member.role}</td>
                              <td className="p-4">
                                <Badge 
                                  variant="outline" 
                                  className={getColorByDepartment(member.department)}
                                >
                                  {member.department}
                                </Badge>
                              </td>
                              <td className="p-4 text-neutral-700">{member.email}</td>
                              <td className="p-4">
                                <div className="flex items-center">
                                  <div className={`h-2 w-2 rounded-full ${getStatusColor(member.status)} mr-2`}></div>
                                  <span className="capitalize text-neutral-700">{member.status}</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <User className="mr-2 h-4 w-4" />
                                      <span>View Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Mail className="mr-2 h-4 w-4" />
                                      <span>Send Email</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Briefcase className="mr-2 h-4 w-4" />
                                      <span>Assign to Project</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      Remove Member
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}