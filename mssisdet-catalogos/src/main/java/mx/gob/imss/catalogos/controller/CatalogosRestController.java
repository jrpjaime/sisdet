package mx.gob.imss.catalogos.controller;

 
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.data.domain.Page;

 
  

import jakarta.validation.Valid; 
 


@Controller
@CrossOrigin("*") 
@RequestMapping("/mssisdet-catalogos/v1")
public class CatalogosRestController {
	private final static Logger logger = LoggerFactory.getLogger(CatalogosRestController.class);
 
	
 
    @GetMapping("/info")
	public ResponseEntity<List<String>> info() {
		logger.info("........................mssisdet-catalogos info..............................");
		List<String> list = new ArrayList<String>();
		list.add("mssisdet-catalogos");
		list.add("20250917");
		list.add("Catálogos");
		return new ResponseEntity<List<String>>(list, HttpStatus.OK);
	}


	@GetMapping("/list")
	public ResponseEntity<List<String>> list() {
		logger.info("........................mssisdet-catalogos list..............................");
		List<String> list = new ArrayList<String>();
		list.add("mssisdet-catalogos");
		list.add("20250917");
		list.add("Catálogos");
		return new ResponseEntity<List<String>>(list, HttpStatus.OK);
	}


 
 
	 
 



 
		
 
 
 

}