import React, { useEffect, useRef } from 'react';
import { AddIcon, DeleteIcon, QuestionIcon, RepeatIcon, SmallAddIcon } from '@chakra-ui/icons'
import { 
  Box, Button, Container, Flex, Heading, Link, 
  List,
  ListItem,
  OrderedList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text
} from "@chakra-ui/react";
import { Reorder } from "framer-motion";

import LoadingSpinner from 'src/components/LoadingSpinner';
import { useAppSelector } from "src/state/hooks/useAppDispatch";
import { setWDLink } from 'src/state/slices/content';
import PortNames from 'src/types/PortNames';
import WDLink from 'src/types/WDLink';
import { wdLinkUpdate } from 'src/util/wdLinkUtil';

const variants = {
  notDragging: { 
    zIndex: 0,
    boxShadow: "none",
    background: "var(--chakra-colors-white)"
 },
  dragging: { 
    zIndex: 1,
    boxShadow: "var(--chakra-shadows-lg)",
    background: "var(--chakra-colors-blue-100)"
  }
};

const SidePanelApp = () => {
  const initLink = [{ title: '', url: '' } as chrome.bookmarks.BookmarkTreeNode];
  const port = useRef<chrome.runtime.Port>();
  const [isConnected, setIsConnected] = React.useState(false);
  const [linkList, setList] = React.useState(initLink);
  const [folderId, setFolderId] = React.useState('');
  const _wdLink = useAppSelector(state => state.content.wdLink);
  
  const connect = async () => {
    const sidePanelPort = chrome.runtime.connect({ name: PortNames.SidePanelPort });
    port.current = sidePanelPort;
    sidePanelPort.postMessage({ type: 'init', message: 'init from panel open' });  

    sidePanelPort.onMessage.addListener(message => {
      if (message.type === 'handle-init') {
        setIsConnected(true);
        setWDLink({ title: '', url: '', tenant: '', proxy: '', stopProxy: '', login: '' });
        loadBookmarks();
      }

      if (message.type === 'tab-updated') {
        sidePanelPort.postMessage({ type: 'init', message: 'init from tab connected' });
        if (!isConnected) {
          refresh();
        }
      }
    });

  };

  useEffect(() => {
    connect();
  }, []);

  const loadBookmarks = () => {chrome.bookmarks.getTree((tree: chrome.bookmarks.BookmarkTreeNode[]) => {

    const wdSideKickTitle = "WD Sidekick";   

    var topFolders = tree[0].children;
    var otherBookmarks: chrome.bookmarks.BookmarkTreeNode = {
      title: '',
      id: ''
    };
    var wdSideKickBookmarks: chrome.bookmarks.BookmarkTreeNode = {
      title: '',
      id: ''
    };

      topFolders?.forEach(function(folder) {
          if (folder.title.toLowerCase() === "other bookmarks") {
            otherBookmarks = folder;
            if (otherBookmarks.children) {
              otherBookmarks.children.forEach(function(obFolder) {
                if (obFolder.title === wdSideKickTitle) {
                  setFolderId(obFolder.id);
                  wdSideKickBookmarks = obFolder;
                }
              });
            }
          }
      });

      if (wdSideKickBookmarks.title.length === 0 && otherBookmarks.id.length !== 0) {
        chrome.bookmarks.create({ 
          title: wdSideKickTitle, 
          parentId: otherBookmarks.id 
        });

        return;
      }

      if (wdSideKickBookmarks) {
          if (wdSideKickBookmarks.children) {
            displayBookmarks(wdSideKickBookmarks.children);
          }
        }
      }
  )};
  
  // Recursively display the bookmarks
  function displayBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
    while(linkList.length > 0) {
      linkList.pop();
    }

    for (const node of nodes) {
      // If the node is a bookmark, create a list item and append it to the parent node
      if (node.url) {
        linkList.push(node);
        setList(linkList);
      }
    }
  }

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noreferrer');    
  };

  const saveCurrentTab = (id: string, linkList: chrome.bookmarks.BookmarkTreeNode[]) => {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, ([currentTab]) => {
      if (currentTab) {
        let link = {} as WDLink;
        link.title = currentTab.title + "";
        link.url = currentTab.url + "";
        saveBookmark(link, id, linkList);
      }
    });
  }

  const saveBookmark = (link: WDLink, id: string, linkList: chrome.bookmarks.BookmarkTreeNode[]) => {
    if (link.title.length > 0 && link.url.length > 0 && id.length > 0) {
      chrome.bookmarks.create({ 
        title: link.title, 
        url: link.url,
        parentId: id
      },
      newLink => {
        linkList.push(newLink);
        const newLinkList = linkList.map(item => item);
        setList(newLinkList);
      });      
    }
  };

  const deleteBookmark = (id: string, linkList: chrome.bookmarks.BookmarkTreeNode[]) => {
    if (id.length > 0) {
      chrome.bookmarks.remove(id);
      const newLinkList = linkList.filter(item => item.id !== id);
      setList(newLinkList);
    }
  };
  
  function OnReorder(newOrder: any[]) {
      let order = 0;
      newOrder.forEach(bookmark => {
        if (order !== bookmark.index) {
          chrome.bookmarks.move(bookmark.id, { index: order });  
        } 

        order++;
      });
      
      setList(newOrder);
  }

  const refresh = () => {
    window.location.reload();  
  };

  if (!isConnected) {
    return (
      <Box height="100vh">
        <LoadingSpinner />
      </Box>
    );
  }
 
  return (
      <Container bg='gray.100' 
        minH={'100vh'}
        overflowY={'hidden'}
        textAlign={'left'}
      >
      <Container bg={'white'} mt={2} p={2} rounded="md" textAlign={'left'}>
        <Button
          bg={'ButtonFace'}
          ml={'8px'}
          size={'xs'}
          title='Add current tab'       
          onClick={() => saveCurrentTab(folderId, linkList)}
        ><SmallAddIcon marginRight={'2px'} />
          Add Tab</Button>     
        <Button
          bg={'ButtonFace'}
          ml={'8px'}
          size={'xs'}
          title='Connect'       
          onClick={() => refresh()}
        ><RepeatIcon marginRight={'2px'} />
          Connect</Button>     
      </Container>
      <Container mt={4} textAlign={'center'} >
        <Flex>
          <Container w={'75%'}>
            <Heading size={'md'} textAlign={'right'}>Bookmark Preview</Heading>
          </Container>
          <Container fontSize={'md'} textAlign={'left'} w={'25%'}>
            <Popover trigger='hover'>
            <PopoverTrigger>
              <QuestionIcon fontSize={'md'} />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>Bookmark Preview</PopoverHeader>
              <PopoverBody><OrderedList><ListItem>Right-click or control-click a Workday object link.</ListItem>
                    <ListItem>Hover over any link in the pop up.</ListItem>
                    <ListItem>Click Connect (above) if the Bookmark Preview does not change.</ListItem>
                    <ListItem>Click Add Bookmark (+) to save the previewed bookmark.</ListItem>
                    </OrderedList>
              </PopoverBody>
            </PopoverContent>
            </Popover>
            </Container>
          </Flex>
      </Container>
      <Container bg="white" key="{_wdLink.text}" mt={2} p={2} rounded="md">
        <Flex>
        <Box w='95%'>
        <Text fontWeight={'bold'}>           
            { _wdLink.tenant.length > 0 ?
              (<span>[
              <Link
                color={'blue.500'}
                role="link"
                title='Login'
                onClick={() => openInNewTab(_wdLink.login)}
              >
                {_wdLink.tenant}
              </Link>
              ] - </span>)
              : ''
            }
            {_wdLink.title}
          </Text>
          <p>
            {_wdLink.title && _wdLink.title.length > 0 ?   
              (<Link
                role="link"
                title='See in New Tab'
                onClick={() => openInNewTab(_wdLink.url)}
              >
                Link
              </Link>)
            : ""}
            {_wdLink.proxy && _wdLink.proxy.length > 0 ? 
              (<Link
                ml={4}
                role="link"
                title='Start Proxy'
                onClick={() => openInNewTab( _wdLink.proxy)}
              >
                Start Proxy
              </Link>)
            : ""}
            { _wdLink.stopProxy && _wdLink.stopProxy.length > 0 ? 
              (<Link
                ml={4}
                role="link"
                title='Stop Proxy'
                onClick={() => openInNewTab( _wdLink.stopProxy)}
              >
                Stop Proxy
              </Link>)
            : ""}
            </p>
            </Box>
            { _wdLink.stopProxy && _wdLink.stopProxy.length > 0 ? 
              (<Box textAlign={'right'}>
                <Button
                  size={'xs'}
                  title='Add Bookmark'
                  onClick={() => saveBookmark(_wdLink, folderId, linkList)}
                >
                  <AddIcon boxSize={3} />
                </Button>
            </Box>)
            : ""}
          </Flex>          
        </Container>
        <Container mt={6} textAlign={'center'} ><Heading size={'md'}>WD Sidekick Bookmarks</Heading></Container>
          <List 
            as={Reorder.Group} 
            axis="y" 
            size="xl" 
            spacing={5} 
            values={linkList}
            variant="custom"
            onReorder={OnReorder}>
            {linkList.map(item => {
              const newWDLink = { title: item.title, url: item.url, tenant: '', proxy: '', stopProxy: '', login: '' } as WDLink;
              const wdLink = wdLinkUpdate( newWDLink );
              return (
                <ListItem  
                  as={Reorder.Item} 
                  bg="white" 
                  cursor="move" 
                  initial="notDragging" 
                  key={item.index} 
                  mt={2}
                  p={2}
                  position="relative"
                  rounded="md"
                  value={item}
                  variants={variants}
                  whileDrag="dragging"
                  >
                  <Flex>
                    <Box w='95%'>
                      <Text fontWeight={'bold'}>
                        { wdLink.tenant.length > 0 ?
                          (<span>[
                          <Link
                            color={'blue.500'}
                            role="link"
                            title='Login'
                            onClick={() => openInNewTab(wdLink.login)}
                          >
                            {wdLink.tenant}
                          </Link>
                          ] - </span>)
                          : ''
                        }
                        {item.title}
                      </Text>
                      <p>
                        <Link                   
                          role="link"
                          title='See in New Tab'
                          onClick={() => openInNewTab(item.url + '')}>
                            Link
                        </Link>
                        { wdLink.proxy.length > 0 ? 
                        (<Link
                            ml={4}
                            role="link"
                            title='Start Proxy'
                            onClick={() => openInNewTab(wdLink.proxy)}                    
                          >
                            Start Proxy
                          </Link>)
                          : "" }
                        { wdLink.stopProxy.length > 0 ? 
                          (<Link
                            ml={4}
                            role="link"
                            title='Stop Proxy'
                            onClick={() => openInNewTab( wdLink.stopProxy)}
                          >
                            Stop Proxy
                          </Link>)
                        : ""}
                        </p>
                      </Box>
                    <Box textAlign={'right'}>
                        <Button
                          size={'xs'}
                          title='Delete'
                          onClick={() => deleteBookmark(item.id, linkList)}
                        >
                          <DeleteIcon boxSize={3} />
                        </Button>
                    </Box>
                    </Flex>
                </ListItem>
              )
            })}
            </List>
      </Container>
    );
};

export default SidePanelApp;
