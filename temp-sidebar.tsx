// Temporär fil med ändrad kod
// Den här delen ska ersätta del av Sidebar.tsx

                      {/* Plustecken för alla mappar - nu till höger FÖRE chevron-pilen */}
                      {item.type === "folder" && item.onAddClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.onAddClick) item.onAddClick();
                          }}
                          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-1 text-muted-foreground"
                          aria-label="Lägg till ny mapp"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Chevron-pil - alltid till höger */}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />